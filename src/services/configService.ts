import { get, set } from 'idb-keyval';

export type AIProvider = 'gemini' | 'openai' | 'qwen' | 'volcengine' | 'zhipu' | 'deepseek' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  geminiKey: string;
  geminiModel: string;
  openaiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  temperature?: number;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'gemini',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: 'gemini-3.1-pro-preview',
  openaiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o',
  temperature: 0.1,
};

export async function loadConfig(): Promise<AIConfig> {
  try {
    const saved = await get<AIConfig>('ai_config');
    if (saved) {
      return { 
        ...DEFAULT_CONFIG, 
        ...saved, 
        // Ensure Gemini key falls back to env if saved is empty
        geminiKey: saved.geminiKey || DEFAULT_CONFIG.geminiKey 
      };
    }
  } catch (e) {
    console.error("Failed to load config", e);
  }
  return DEFAULT_CONFIG;
}

export async function saveConfig(config: AIConfig): Promise<void> {
  await set('ai_config', config);
}
