import React, { useState, useEffect } from 'react';
import { AIConfig, AIProvider, loadConfig, saveConfig } from '../services/configService';
import { X, Settings2, Save, Database, ChevronDown } from 'lucide-react';
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
    defaultModel: 'doubao-seed-2-0-lite-260215',
    models: ['doubao-seed-2-0-lite-260215', 'doubao-seed-2-0-pro-260215']
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
  const [showModelDropdown, setShowModelDropdown] = useState(false);

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
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">模型名称</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={config.geminiModel}
                      onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                      onFocus={() => setShowModelDropdown(true)}
                      onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    
                    <AnimatePresence>
                      {showModelDropdown && PROVIDER_PRESETS.gemini.models && PROVIDER_PRESETS.gemini.models.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1"
                        >
                          {PROVIDER_PRESETS.gemini.models.map(m => (
                            <div
                              key={m}
                              className="px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                              onClick={() => {
                                setConfig({ ...config, geminiModel: m });
                                setShowModelDropdown(false);
                              }}
                            >
                              {m}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">模型名称</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={config.openaiModel}
                      onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                      onFocus={() => setShowModelDropdown(true)}
                      onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                      placeholder={PROVIDER_PRESETS[config.provider].defaultModel || "输入模型名称"}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    
                    <AnimatePresence>
                      {showModelDropdown && PROVIDER_PRESETS[config.provider].models && PROVIDER_PRESETS[config.provider].models!.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1"
                        >
                          {PROVIDER_PRESETS[config.provider].models!.map(m => (
                            <div
                              key={m}
                              className="px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                              onClick={() => {
                                setConfig({ ...config, openaiModel: m });
                                setShowModelDropdown(false);
                              }}
                            >
                              {m}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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

            {/* Embedding Settings */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Database size={16} className="text-indigo-500" />
                向量检索配置 (RAG)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setConfig({ ...config, embeddingProvider: 'gemini', embeddingModel: 'gemini-embedding-2-preview' })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    config.embeddingProvider === 'gemini' 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-800 mb-1 text-sm">Google Gemini</div>
                  <div className="text-xs text-slate-500">gemini-embedding-2-preview</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, embeddingProvider: 'openai', embeddingModel: 'text-embedding-3-small' })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    config.embeddingProvider === 'openai' 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-800 mb-1 text-sm">OpenAI 兼容</div>
                  <div className="text-xs text-slate-500">text-embedding-3-small</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, embeddingProvider: 'volcengine', embeddingModel: 'doubao-embedding-vision-251215' })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    config.embeddingProvider === 'volcengine' 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-800 mb-1 text-sm">火山引擎 (Doubao)</div>
                  <div className="text-xs text-slate-500">doubao-embedding-vision</div>
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Embedding 模型名称</label>
                <input 
                  type="text" 
                  value={config.embeddingModel || ''}
                  onChange={(e) => setConfig({ ...config, embeddingModel: e.target.value })}
                  placeholder="例如：text-embedding-3-small"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
                />
                <p className="text-xs text-slate-500 mt-2">
                  注意：更改 Embedding 模型后，之前上传的授权文件向量将会失效，您可能需要重新上传文件以构建新的向量库。
                </p>
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
