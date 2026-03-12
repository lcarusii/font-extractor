import React from 'react';
import { FontResult } from '../services/aiService';
import { Type, CheckCircle2, AlertCircle, HelpCircle, Quote, Layers, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface FontResultsProps {
  results: FontResult[];
  isLoading: boolean;
}

export function FontResults({ results, isLoading }: FontResultsProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-12 space-y-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 font-medium">AI 正在深度分析排版特征与版权信息...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
              <div className="h-8 bg-slate-100 rounded-lg w-2/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-24 bg-slate-50 rounded-2xl w-full"></div>
                <div className="h-24 bg-slate-50 rounded-2xl w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case '高':
        return <CheckCircle2 className="text-emerald-500" size={16} strokeWidth={2.5} />;
      case '中':
        return <AlertCircle className="text-amber-500" size={16} strokeWidth={2.5} />;
      case '低':
        return <HelpCircle className="text-slate-400" size={16} strokeWidth={2.5} />;
      default:
        return <HelpCircle className="text-slate-400" size={16} strokeWidth={2.5} />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case '高':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case '中':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case '低':
        return 'bg-slate-50 text-slate-700 border-slate-200/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/60';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-12 space-y-8">
      <div className="flex items-center gap-3 px-2">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
          <Type size={24} strokeWidth={2} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
          识别结果
        </h3>
        <span className="ml-auto text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          共发现 {results.length} 种字体
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
            key={index}
            className="bg-white p-6 xl:p-8 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col"
          >
            <div className="mb-6">
              <h4 className="text-2xl xl:text-3xl font-bold text-slate-900 mb-3 tracking-tight leading-tight">{result.primaryFont}</h4>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getConfidenceColor(result.confidence)}`}>
                {getConfidenceIcon(result.confidence)}
                置信度：{result.confidence}
              </div>
            </div>
            
            <div className="space-y-4 flex-grow">
              {result.licenseCheck && (
                <div className={`rounded-2xl p-4 border ${result.licenseCheck.isAllowed ? 'bg-emerald-50/80 border-emerald-100' : 'bg-red-50/80 border-red-100'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${result.licenseCheck.isAllowed ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.licenseCheck.isAllowed ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                    <span className="text-sm font-bold uppercase tracking-wider">
                      版权核查: {result.licenseCheck.isAllowed ? '允许使用' : '存在风险'}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${result.licenseCheck.isAllowed ? 'text-emerald-600' : 'text-red-600'}`}>
                    {result.licenseCheck.reason}
                  </p>
                </div>
              )}

              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <Quote size={18} />
                  <span className="text-sm font-bold uppercase tracking-wider">文本片段</span>
                </div>
                <p className="text-lg text-slate-800 font-medium leading-relaxed">
                  "{result.textSnippet}"
                </p>
              </div>
              
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <Layers size={18} />
                  <span className="text-sm font-bold uppercase tracking-wider">相似备选字体</span>
                </div>
                <div className="flex flex-col gap-3">
                  {result.possibleAlternatives && result.possibleAlternatives.length > 0 ? (
                    result.possibleAlternatives.map((alt, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-800 font-bold">{alt.fontName}</span>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border ${getConfidenceColor(alt.confidence)}`}>
                            {getConfidenceIcon(alt.confidence)}
                            {alt.confidence}
                          </div>
                        </div>
                        {alt.licenseCheck && (
                          <div className={`mt-1 rounded-lg p-2.5 border text-xs ${alt.licenseCheck.isAllowed ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-red-50/50 border-red-100 text-red-700'}`}>
                            <div className="flex items-center gap-1.5 mb-1 font-semibold">
                              {alt.licenseCheck.isAllowed ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                              <span>{alt.licenseCheck.isAllowed ? '允许使用' : '存在风险'}</span>
                            </div>
                            <p className="opacity-90 leading-relaxed">{alt.licenseCheck.reason}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">无备选字体</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
