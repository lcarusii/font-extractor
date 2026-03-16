import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig } from "./configService";
import { LicenseDocument, DocumentChunk, getAllDocumentChunks } from "./dbService";

export interface AlternativeFont {
  fontName: string;
  confidence: "高" | "中" | "低";
  licenseCheck?: {
    isAllowed: boolean;
    reason: string;
  };
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function generateEmbedding(text: string, config: AIConfig): Promise<number[]> {
  if (config.embeddingProvider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.geminiKey });
    const result = await ai.models.embedContent({
      model: config.embeddingModel || 'gemini-embedding-2-preview',
      contents: [text]
    });
    return result.embeddings?.[0]?.values || [];
  } else if (config.embeddingProvider === 'volcengine') {
    const url = 'https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`
      },
      body: JSON.stringify({
        model: config.embeddingModel || 'doubao-embedding-vision-251215',
        input: [
          {
            type: 'text',
            text: text
          }
        ]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to generate embedding: ${err.error?.message || res.statusText}`);
    }
    const data = await res.json();
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      if (typeof data.data[0] === 'number') {
        return data.data;
      } else if (data.data[0].embedding) {
        return data.data[0].embedding;
      }
    }
    
    if (data.data && !Array.isArray(data.data) && data.data.embedding) {
      return data.data.embedding;
    } else if (data.embedding) {
      return data.embedding;
    } else {
      throw new Error(`Unexpected embedding response: ${JSON.stringify(data)}`);
    }
  } else {
    const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/embeddings') ? baseUrl : `${baseUrl}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`
      },
      body: JSON.stringify({
        model: config.embeddingModel || 'text-embedding-3-small',
        input: text
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to generate embedding: ${err.error?.message || res.statusText}`);
    }
    const data = await res.json();
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      if (typeof data.data[0] === 'number') {
        return data.data;
      } else if (data.data[0].embedding) {
        return data.data[0].embedding;
      }
    }
    
    if (data.data && !Array.isArray(data.data) && data.data.embedding) {
      return data.data.embedding;
    } else if (data.embedding) {
      return data.embedding;
    } else {
      throw new Error(`Unexpected embedding response: ${JSON.stringify(data)}`);
    }
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchVectorStore(query: string, config: AIConfig, topK: number = 3): Promise<DocumentChunk[]> {
  const queryEmbedding = await generateEmbedding(query, config);
  const allChunks = await getAllDocumentChunks();
  
  if (allChunks.length === 0) return [];

  const scoredChunks = allChunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));
  
  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK).map(sc => sc.chunk);
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
  licenseFiles?: LicenseDocument[],
  temperature?: number
): Promise<FontResult[]> {
  const temp = temperature ?? config.temperature ?? 0.1;
  let prompt = `你是一个顶级的字体排印专家和版权律师助手。请仔细分析这张图片中的排版，精准识别文本所使用的具体字体。

【任务 1：字体识别】
- 必须提供具体的商业或开源字体名称（例如："思源黑体", "Helvetica Neue", "方正兰亭黑"），绝不能使用泛指的分类名称（如 "Sans-serif", "黑体"）。
- **重要：如果图片中多处文本使用了同一种字体，请将它们合并为一条记录，并在 textSnippet 中包含所有相关的文本片段（用逗号分隔）。不要为同一种字体生成多条重复的记录。**
- textSnippet: 提取出使用该字体的对应文本片段（如果是多处，用逗号分隔）。
- primaryFont: 最可能的首选字体名称。
- possibleAlternatives: 提供 2-3 个视觉特征高度相似的备选字体。每个备选字体必须是一个对象，包含 fontName (字体名称) 和 confidence (与原图字体相似的置信度：高/中/低)。
- confidence: 首选字体识别的置信度（高/中/低）。`;

  let licenseTextContext = "";
  if (brandName && licenseFiles && licenseFiles.length > 0) {
    const query = `客户品牌 ${brandName} 授权的字体、商用规则、可用字体列表`;
    const relevantChunks = await searchVectorStore(query, config, 10);
    licenseTextContext = relevantChunks.map(c => c.text).join('\n\n---\n\n');

    prompt += `\n\n【任务 2：版权核查】
用户询问客户品牌“${brandName}”是否可以合法商用这些识别出的字体。
请【绝对严格】依据以下检索到的授权文件片段进行核查，并为首选字体(primaryFont)以及每个备选字体(possibleAlternatives中的每一项)都增加一个 licenseCheck 对象字段：
- isAllowed (boolean): 必须绝对基于检索到的文件片段进行判断。只有当片段中明确允许该品牌（或所有用户）商用此字体时，才返回 true。只要该字体没有在片段中出现，或者未明确授权，一律返回 false（即使它是众所周知的免费开源字体）。
- reason (string): 引用片段中的具体条款解释原因。如果片段中完全没有提及该字体，请务必说明“未在检索到的授权记录中找到该字体的授权，因此判定为不可用”。

检索到的授权文件片段：
${licenseTextContext || '（无相关内容）'}`;
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

    contents.push(prompt);

    let response;
    try {
      response = await ai.models.generateContent({
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
    } catch (e: any) {
      console.error("Gemini API error:", e);
      if (e.message?.includes('fetch') || e.message?.includes('network')) {
        throw new Error(`网络请求失败 (Failed to fetch)。如果您在中国大陆，可能需要配置代理才能访问 Google Gemini API。`);
      }
      throw e;
    }

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

    let res: Response;
    try {
      res = await fetch(url, {
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
    } catch (e: any) {
      console.error("Fetch error:", e);
      throw new Error(`网络请求失败 (Failed to fetch)。这通常是因为跨域限制 (CORS) 或网络连接问题。请检查您的 API 地址 (${url}) 是否支持跨域请求，或者尝试更换网络环境。`);
    }

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

export async function detectTextRegions(
  base64Image: string, 
  mimeType: string,
  config: AIConfig
): Promise<{x: number, y: number, width: number, height: number}[] | null> {
  const prompt = `你是一个专业的计算机视觉助手。请分析这张图片，找出其中包含文字的主要区域。
请返回一个 JSON 数组，数组中的每个对象代表一个文字区域的边界框（bounding box）。
边界框的坐标和尺寸请使用相对于图片宽度和高度的百分比（0 到 100 之间的数字）。
每个对象必须包含以下字段：
- x: 区域左上角的 X 坐标百分比
- y: 区域左上角的 Y 坐标百分比
- width: 区域的宽度百分比
- height: 区域的高度百分比

如果图片中没有文字，请返回空数组 []。
请直接返回纯 JSON 数组，不要包含任何其他文本或 Markdown 标记。`;

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.geminiKey });
    let response;
    try {
      response = await ai.models.generateContent({
        model: config.geminiModel,
        contents: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          prompt
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER }
              },
              required: ["x", "y", "width", "height"]
            }
          }
        }
      });
    } catch (e: any) {
      console.error("Gemini API error:", e);
      if (e.message?.includes('fetch') || e.message?.includes('network')) {
        throw new Error(`网络请求失败 (Failed to fetch)。如果您在中国大陆，可能需要配置代理才能访问 Google Gemini API。`);
      }
      throw e;
    }

    const text = response.text;
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse regions JSON", e);
      return null;
    }
  } else {
    // OpenAI Compatible API
    if (!config.openaiKey) throw new Error("OpenAI API Key is required.");
    
    const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiKey}`
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: base64Image } }
              ]
            }
          ],
          temperature: 0.1
        })
      });
    } catch (e: any) {
      console.error("Fetch error:", e);
      throw new Error(`网络请求失败 (Failed to fetch)。这通常是因为跨域限制 (CORS) 或网络连接问题。请检查您的 API 地址 (${url}) 是否支持跨域请求，或者尝试更换网络环境。`);
    }

    if (!res.ok) return null;
    const data = await res.json();
    let content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) content = jsonMatch[1];
    
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse regions JSON", e);
      return null;
    }
  }
}

export async function chatWithAgent(
  messages: { role: 'user' | 'assistant', content: string }[],
  knowledgeBase: LicenseDocument[],
  config: AIConfig
): Promise<string> {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || "";
  const relevantChunks = await searchVectorStore(lastUserMessage, config, 10);
  const kbText = relevantChunks.map(c => c.text).join('\n\n---\n\n');

  const systemPrompt = `你是一个专业的字体与版权助手。请基于以下检索到的知识库（授权文件）片段回答用户的问题。
要求：
1. 回答必须极度简明扼要，直接给出结论，不要长篇大论。
2. 采用最简单的纯文本排版，不要使用复杂的 Markdown 格式（如粗体、斜体、多级标题或表格）。
3. 不要说任何废话或客套话。
4. 【严格审查规则】：绝对基于检索到的文件片段进行判断。只要用户询问的字体没有在检索到的片段中出现，或者未明确授权，一律判定为不可用（即使它是众所周知的免费开源字体），并明确告知“未在检索到的授权记录中找到该字体的授权，判定为不可用”。

检索到的知识库片段：
${kbText || '（暂无相关知识库片段）'}`;

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

    // Inject system prompt into the first user message
    if (formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
       formattedMessages[0].parts.unshift({ text: systemPrompt });
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: config.geminiModel,
        contents: formattedMessages
      });
    } catch (e: any) {
      console.error("Gemini API error:", e);
      if (e.message?.includes('fetch') || e.message?.includes('network')) {
        throw new Error(`网络请求失败 (Failed to fetch)。如果您在中国大陆，可能需要配置代理才能访问 Google Gemini API。`);
      }
      throw e;
    }
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

    let res: Response;
    try {
      res = await fetch(url, {
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
    } catch (e: any) {
      console.error("Fetch error:", e);
      throw new Error(`网络请求失败 (Failed to fetch)。这通常是因为跨域限制 (CORS) 或网络连接问题。请检查您的 API 地址 (${url}) 是否支持跨域请求，或者尝试更换网络环境。`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}

export async function extractBrandsFromKnowledgeBase(
  knowledgeBase: LicenseDocument[],
  config: AIConfig
): Promise<string[]> {
  if (!knowledgeBase || knowledgeBase.length === 0) return [];

  const query = "提取出所有被授权方（客户品牌、公司名称、产品名称等）";
  const relevantChunks = await searchVectorStore(query, config, 10);
  
  let kbText = relevantChunks.map(c => c.text).join('\n\n---\n\n');

  const prompt = `你是一个专业的文本分析助手。请分析以下检索到的授权文件片段，提取出其中提及的所有被授权方（客户品牌、公司名称、产品名称等）。
请返回一个 JSON 数组，数组中只包含品牌名称的字符串。
如果没有找到任何明确的品牌或公司名称，请返回空数组 []。
请直接返回纯 JSON 数组，不要包含任何其他文本或 Markdown 标记（如 \`\`\`json）。

检索到的授权文件片段：
${kbText || '（无相关内容）'}`;

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.geminiKey });
    const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
    
    let response;
    try {
      response = await ai.models.generateContent({
        model: config.geminiModel,
        contents: contents,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
    } catch (e: any) {
      console.error("Gemini API error:", e);
      if (e.message?.includes('fetch') || e.message?.includes('network')) {
        throw new Error(`网络请求失败 (Failed to fetch)。如果您在中国大陆，可能需要配置代理才能访问 Google Gemini API。`);
      }
      throw e;
    }

    const text = response.text;
    if (!text) return [];
    try {
      return JSON.parse(text);
    } catch (e) {
      return [];
    }
  } else {
    // OpenAI Compatible API
    if (!config.openaiKey) throw new Error("OpenAI API Key is required.");
    
    const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiKey}`
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });
    } catch (e: any) {
      console.error("Fetch error:", e);
      throw new Error(`网络请求失败 (Failed to fetch)。这通常是因为跨域限制 (CORS) 或网络连接问题。请检查您的 API 地址 (${url}) 是否支持跨域请求，或者尝试更换网络环境。`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    let content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) content = jsonMatch[1];
    
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
}
