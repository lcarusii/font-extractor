import React, { useState, useEffect } from 'react';
import { AIConfig, AIProvider, loadConfig, saveConfig } from '../services/configService';
import { X, Settings2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIConfig) => void;
}

const PROVIDER_PRESETS: Record<AIProvider, { name: string, desc: string, baseUrl?: string, defaultModel?: string, models?: string[] }> = {
  gemini: {
    name: 'Google Gemini',
    desc: '原生支持多模态与 PDF 解析',
    models: ['gemini-3.1-pro-preview', 'gemini-3.1-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash']
  },
  openai: {
    name: 'OpenAI',
    desc: '官方接口',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini']
  },
  qwen: {
    name: '阿里云百炼 (Qwen)',
    desc: '通义千问大模型',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-vl-max',
    models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen-max', 'qwen-plus']
  },
  volcengine: {
    name: '火山引擎 (Doubao)',
    desc: '豆包大模型',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'ep-xxxxxx-xxx',
    models: [] // Volcengine uses custom endpoint IDs
  },
  zhipu: {
    name: '智谱 AI (GLM)',
    desc: 'GLM 系列模型',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4v',
    models: ['glm-4v', 'glm-4v-plus', 'glm-4-plus']
  },
  deepseek: {
    name: 'DeepSeek',
    desc: '深度求索',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  custom: {
    name: '自定义 (OpenAI 兼容)',
    desc: '任意兼容 OpenAI 格式的接口',
  }
};

export function ConfigModal({ isOpen, onClose, onSave }: ConfigModalProps) {
  const [config, setConfig] = useState<AIConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig().then(setConfig);
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const handleSave = async () => {
    await saveConfig(config);
    onSave(config);
    onClose();
  };

  const handleProviderChange = (provider: AIProvider) => {
    const preset = PROVIDER_PRESETS[provider];
    setConfig(prev => {
      if (!prev) return prev;
      const newConfig = { ...prev, provider };
      if (provider !== 'gemini' && provider !== 'custom') {
        if (preset.baseUrl) newConfig.openaiBaseUrl = preset.baseUrl;
        if (preset.defaultModel) newConfig.openaiModel = preset.defaultModel;
      }
      return newConfig;
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-800">
              <Settings2 size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold">AI 模型配置中心</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">选择服务商</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.entries(PROVIDER_PRESETS) as [AIProvider, any][]).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleProviderChange(key)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${
                      config.provider === key 
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-800 mb-1 text-sm">{preset.name}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Gemini Settings */}
            {config.provider === 'gemini' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Gemini API Key</label>
                  <input 
                    type="password" 
                    value={config.geminiKey}
                    onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
                    placeholder="AI Studio 默认已注入，可留空"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">模型名称</label>
                  <input 
                    type="text" 
                    list="gemini-models"
                    value={config.geminiModel}
                    onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                  <datalist id="gemini-models">
                    {PROVIDER_PRESETS.gemini.models?.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </motion.div>
            )}

            {/* OpenAI Compatible Settings */}
            {config.provider !== 'gemini' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs">
                  注意：OpenAI 兼容接口目前在浏览器端仅支持解析 TXT/MD 格式的授权文件。PDF 文件解析需使用 Gemini。部分模型（如 DeepSeek）可能不支持图片识别，仅支持文本对话。
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Base URL</label>
                  <input 
                    type="text" 
                    value={config.openaiBaseUrl}
                    onChange={(e) => setConfig({ ...config, openaiBaseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">API Key</label>
                  <input 
                    type="password" 
                    value={config.openaiKey}
                    onChange={(e) => setConfig({ ...config, openaiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">模型名称</label>
                  <input 
                    type="text" 
                    list={`models-${config.provider}`}
                    value={config.openaiModel}
                    onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                    placeholder={PROVIDER_PRESETS[config.provider].defaultModel || "输入模型名称"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                  <datalist id={`models-${config.provider}`}>
                    {PROVIDER_PRESETS[config.provider].models?.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  {config.provider === 'volcengine' && (
                    <p className="text-xs text-slate-500 mt-2">火山引擎需要输入您创建的接入点 ID (Endpoint ID)，例如：ep-20240101-xxxxx</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Temperature Setting */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">模型温度 (Temperature)</label>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{config.temperature ?? 0.1}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={config.temperature ?? 0.1}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>更精确 (0.0)</span>
                <span>更随机 (1.0)</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Save size={18} />
              保存配置
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
