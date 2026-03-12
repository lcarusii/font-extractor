import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig } from "./configService";
import { LicenseDocument } from "./dbService";

export interface FontResult {
  textSnippet: string;
  primaryFont: string;
  possibleAlternatives: string[];
  confidence: "高" | "中" | "低";
  licenseCheck?: {
    isAllowed: boolean;
    reason: string;
  };
}

export async function extractFontsFromImage(
  base64Image: string, 
  mimeType: string,
  config: AIConfig,
  brandName?: string,
  licenseFiles?: LicenseDocument[],
  temperature?: number
): Promise<FontResult[]> {
  const temp = temperature ?? config.temperature ?? 0.1;
  let prompt = `你是一个顶级的字体排印专家和版权律师助手。请仔细分析这张图片中的排版，精准识别文本所使用的具体字体。

【任务 1：字体识别】
- 必须提供具体的商业或开源字体名称（例如："思源黑体", "Helvetica Neue", "方正兰亭黑"），绝不能使用泛指的分类名称（如 "Sans-serif", "黑体"）。
- textSnippet: 提取出对应的文本片段。
- primaryFont: 最可能的首选字体名称。
- possibleAlternatives: 提供 2-3 个视觉特征高度相似的备选字体名称。
- confidence: 识别的置信度（高/中/低）。`;

  let licenseTextContext = "";
  if (brandName && licenseFiles && licenseFiles.length > 0) {
    prompt += `\n\n【任务 2：版权核查】
用户提供了 ${licenseFiles.length} 个授权/规则文件，并询问客户品牌“${brandName}”是否可以合法商用这些识别出的字体。
请严格依据提供的授权文件内容进行核查，并为每个识别出的字体增加一个 licenseCheck 对象字段：
- isAllowed (boolean): 如果文件中明确允许该品牌（或所有用户）商用此字体，则为 true；如果明确禁止、未提及或条件不符，则为 false。
- reason (string): 引用文件中的具体条款解释原因。如果文件中完全没有提及该字体，请务必说明“授权文件中未提及此字体，无法确定商用权限”。`;
    
    // Extract text from text-based files for OpenAI
    licenseFiles.forEach(f => {
      if (f.mimeType.includes('text') || f.mimeType.includes('json') || f.mimeType.includes('markdown')) {
        try {
          licenseTextContext += `\n--- 文件: ${f.name} ---\n${atob(f.base64.split(',')[1])}\n`;
        } catch (e) {
          console.error("Failed to decode license file", e);
        }
      }
    });
  }

  prompt += `\n\n【输出要求】
请务必使用中文返回结果，并严格以结构化的 JSON 格式返回。JSON 必须包含一个名为 "fonts" 的数组，数组中每个对象包含上述要求的字段。
注意：请直接输出纯 JSON 字符串，不要包含任何多余的解释性文本，也不要使用 \`\`\`json 这样的 Markdown 标记包裹。`;

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.geminiKey });
    const contents: any[] = [
      {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: mimeType,
        },
      }
    ];

    if (brandName && licenseFiles && licenseFiles.length > 0) {
      licenseFiles.forEach((file) => {
        contents.push({
          inlineData: {
            data: file.base64.split(',')[1],
            mimeType: file.mimeType,
          }
        });
      });
    }
    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: contents,
      config: {
        temperature: temp,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fonts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  textSnippet: { type: Type.STRING },
                  primaryFont: { type: Type.STRING },
                  possibleAlternatives: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  confidence: { type: Type.STRING },
                  licenseCheck: {
                    type: Type.OBJECT,
                    properties: {
                      isAllowed: { type: Type.BOOLEAN },
                      reason: { type: Type.STRING }
                    },
                    required: ["isAllowed", "reason"]
                  }
                },
                required: ["textSnippet", "primaryFont", "possibleAlternatives", "confidence"],
              }
            }
          },
          required: ["fonts"]
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    const parsed = JSON.parse(text);
    return parsed.fonts || parsed;

  } else {
    // OpenAI Compatible API
    if (!config.openaiKey) throw new Error("OpenAI API Key is required.");
    
    const openAiMessages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
      }
    ];

    if (licenseTextContext) {
      openAiMessages[0].content.push({ type: 'text', text: `\n授权文件内容：\n${licenseTextContext}` });
    }

    const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages: openAiMessages,
        temperature: temp
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    let content = data.choices[0].message.content;
    
    // Extract JSON if wrapped in markdown
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    } else {
      // Try to extract JSON object or array if there is extra text around it
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      const firstBracket = content.indexOf('[');
      const lastBracket = content.lastIndexOf(']');
      
      let start = -1;
      let end = -1;
      
      if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = lastBrace + 1;
      } else if (firstBracket !== -1 && lastBracket !== -1) {
        start = firstBracket;
        end = lastBracket + 1;
      }
      
      if (start !== -1 && end !== -1) {
        content = content.substring(start, end);
      }
    }
    
    try {
      const parsed = JSON.parse(content);
      return parsed.fonts || parsed || [];
    } catch (e) {
      console.error("Failed to parse JSON:", content);
      throw new Error("模型返回的数据格式不正确，无法解析。这通常是因为模型没有严格按照 JSON 格式输出。请重试。");
    }
  }
}

export async function chatWithAgent(
  messages: { role: 'user' | 'assistant', content: string }[],
  knowledgeBase: LicenseDocument[],
  config: AIConfig
): Promise<string> {
  let kbText = "";
  const geminiParts: any[] = [];

  for (const doc of knowledgeBase) {
    if (doc.mimeType.includes('text') || doc.mimeType.includes('json') || doc.mimeType.includes('markdown')) {
      try {
        const text = atob(doc.base64.split(',')[1]);
        kbText += `\n--- 文档: ${doc.name} ---\n${text}\n`;
      } catch (e) {}
    }
    if (config.provider === 'gemini' && doc.mimeType.includes('pdf')) {
       geminiParts.push({
         inlineData: {
           data: doc.base64.split(',')[1],
           mimeType: doc.mimeType
         }
       });
    }
  }

  const systemPrompt = `你是一个专业的字体与版权助手。请基于以下提供的知识库（授权文件）回答用户的问题。
要求：
1. 回答必须极度简明扼要，直接给出结论，不要长篇大论。
2. 采用最简单的纯文本排版，不要使用复杂的 Markdown 格式（如粗体、斜体、多级标题或表格）。
3. 不要说任何废话或客套话。
4. 如果知识库中没有相关信息，请结合你的专业知识回答，但要明确指出该信息不在知识库中。

知识库内容：
${kbText || '（暂无文本知识库）'}`;

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.geminiKey });
    
    // Gemini expects the first message to be from the user.
    // If the first message in the history is from the assistant, we need to handle it.
    let formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Ensure the first message is from the user for Gemini
    if (formattedMessages.length > 0 && formattedMessages[0].role === 'model') {
       formattedMessages.unshift({
         role: 'user',
         parts: [{ text: '你好' }]
       });
    }

    // Inject system prompt and files into the first user message
    if (formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
       formattedMessages[0].parts.unshift({ text: systemPrompt });
       if (geminiParts.length > 0) {
         formattedMessages[0].parts.push(...geminiParts);
       }
    }

    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: formattedMessages
    });
    return response.text || '';
  } else {
    // OpenAI Compatible API
    if (!config.openaiKey) throw new Error("OpenAI API Key is required.");
    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages: openAiMessages
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}
