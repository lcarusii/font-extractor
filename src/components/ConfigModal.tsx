import React, { useState, useEffect } from 'react';
import { AIConfig, loadConfig, saveConfig } from '../services/configService';
import { X, Settings2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIConfig) => void;
}

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
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setConfig({ ...config, provider: 'gemini' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    config.provider === 'gemini' 
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-800 mb-1">Google Gemini</div>
                  <div className="text-xs text-slate-500">原生支持多模态与 PDF 解析</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, provider: 'openai' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    config.provider === 'openai' 
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-800 mb-1">OpenAI 兼容接口</div>
                  <div className="text-xs text-slate-500">支持 OpenAI, DeepSeek, Qwen 等</div>
                </button>
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
                    value={config.geminiModel}
                    onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </motion.div>
            )}

            {/* OpenAI Settings */}
            {config.provider === 'openai' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs">
                  注意：OpenAI 兼容接口目前在浏览器端仅支持解析 TXT/MD 格式的授权文件。PDF 文件解析需使用 Gemini。
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
                    value={config.openaiModel}
                    onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                    placeholder="gpt-4o"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </motion.div>
            )}
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
