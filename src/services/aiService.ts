import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig } from "./configService";
import { LicenseDocument } from "./dbService";

export interface AlternativeFont {
  fontName: string;
  confidence: "高" | "中" | "低";
  licenseCheck?: {
    isAllowed: boolean;
    reason: string;
  };
}

export interface FontResult {
  textSnippet: string;
  primaryFont: string;
  possibleAlternatives: AlternativeFont[];
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
  licenseFiles?: LicenseDocument[]
): Promise<FontResult[]> {
  let prompt = `分析这张图片中的排版，识别文本所使用的字体。请将图片中的文本划分为不同的片段（textSnippet）。对于每个不同的文本片段，请只返回一个结果对象。在这个对象中，提供最可能的首选字体名称（primaryFont），并列出 2-3 个视觉上最相似的备选字体（possibleAlternatives）。请务必不要为同一个文本片段返回多个结果对象。请务必使用中文返回结果，并以结构化的 JSON 格式返回，包含一个名为 "fonts" 的数组，数组中每个对象包含：textSnippet(文本片段), primaryFont(首选字体), confidence(首选字体的置信度：高/中/低), possibleAlternatives(备选字体对象数组，每个对象包含 fontName(字体名称) 和 confidence(置信度：高/中/低))。`;

  let licenseTextContext = "";
  if (brandName && licenseFiles && licenseFiles.length > 0) {
    prompt += `\n\n此外，用户提供了 ${licenseFiles.length} 个授权/规则文件，并询问客户品牌“${brandName}”是否可以使用这些识别出的字体。请阅读提供的所有文件内容，并为首选字体（primaryFont）以及每一个备选字体（possibleAlternatives 中的每一项）增加一个 licenseCheck 对象字段（包含 isAllowed: boolean 和 reason: string），判断该品牌是否被允许使用该字体，并给出具体的理由（如果文件中没有提及该字体或无法确定，请将 isAllowed 设为 false，并在 reason 中说明“文件中未提及此字体，无法确定”）。`;
    
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
        temperature: 0.1, // Lower temperature for more deterministic/accurate font recognition
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
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fontName: { type: Type.STRING },
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
                      required: ["fontName", "confidence"]
                    }
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

    const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages: openAiMessages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'OpenAI API Error');
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parsed.fonts || [];
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
    
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    
    if (contents.length > 0 && contents[0].role === 'user') {
       contents[0].parts.unshift({ text: systemPrompt });
       contents[0].parts.push(...geminiParts);
    }

    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: contents
    });
    return response.text || '';
  } else {
    // OpenAI Compatible API
    if (!config.openaiKey) throw new Error("OpenAI API Key is required.");
    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
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
      const err = await res.json();
      throw new Error(err.error?.message || 'OpenAI API Error');
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}
