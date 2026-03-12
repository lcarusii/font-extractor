import React from 'react';
import { FontResult, AlternativeFont } from '../services/aiService';
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

  const groupedResults = React.useMemo(() => {
    if (!results) return [];
    const map = new Map<string, FontResult & { textSnippets: string[] }>();
    
    results.forEach(result => {
      const key = result.primaryFont;
      if (map.has(key)) {
        const existing = map.get(key)!;
        if (!existing.textSnippets.includes(result.textSnippet)) {
          existing.textSnippets.push(result.textSnippet);
        }
        if (result.possibleAlternatives) {
          const existingAlts = existing.possibleAlternatives || [];
          const newAlts = result.possibleAlternatives.filter(
            newAlt => !existingAlts.some(eAlt => eAlt.fontName === newAlt.fontName)
          );
          existing.possibleAlternatives = [...existingAlts, ...newAlts];
        }
      } else {
        map.set(key, { ...result, textSnippets: [result.textSnippet] });
      }
    });
    
    return Array.from(map.values());
  }, [results]);

  const hasLicenseCheck = groupedResults.some(r => r.licenseCheck !== undefined);
  const riskyFonts = groupedResults.filter(r => r.licenseCheck && !r.licenseCheck.isAllowed);
  const lowConfidenceFonts = groupedResults.filter(r => r.confidence === '低');

  const renderSummary = () => {
    if (hasLicenseCheck && riskyFonts.length > 0) {
      return (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-red-800">
            <ShieldAlert size={20} className="text-red-600" />
            <h4 className="font-bold text-base">发现 {riskyFonts.length} 处版权风险</h4>
          </div>
          <div className="space-y-3">
            {riskyFonts.map((risk, idx) => {
              const safeAlts = risk.possibleAlternatives?.filter(a => !a.licenseCheck || a.licenseCheck.isAllowed) || [];
              return (
                <div key={idx} className="bg-white/80 rounded-xl p-3.5 border border-red-100 text-sm shadow-sm">
                  <p className="text-slate-700 mb-2 leading-relaxed">
                    片段 <span className="font-bold text-slate-900">"{risk.textSnippets.join(', ')}"</span> 
                    使用的 <span className="font-bold text-red-700">{risk.primaryFont}</span> 存在商用风险。
                  </p>
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-red-100/50">
                    <span className="text-slate-500 shrink-0 text-xs font-medium mt-0.5">安全替换建议：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {safeAlts.length > 0 ? (
                        safeAlts.map((alt, i) => (
                          <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-xs border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck size={12} />
                            {alt.fontName}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs mt-0.5">暂无安全的备选字体推荐，请手动排查</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (hasLicenseCheck && riskyFonts.length === 0) {
      return (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 shadow-sm">
          <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-emerald-800 font-bold mb-1">版权核查通过</h4>
            <p className="text-emerald-700 text-sm">当前识别出的所有字体均符合您提供的商用授权规则，未发现风险。</p>
          </div>
        </div>
      );
    }

    if (!hasLicenseCheck && lowConfidenceFonts.length > 0) {
      return (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-amber-800">
            <AlertCircle size={20} className="text-amber-600" />
            <h4 className="font-bold text-base">部分字体识别置信度较低</h4>
          </div>
          <div className="space-y-3">
            {lowConfidenceFonts.map((font, idx) => (
              <div key={idx} className="bg-white/80 rounded-xl p-3.5 border border-amber-100 text-sm shadow-sm">
                <p className="text-slate-700 mb-2 leading-relaxed">
                  片段 <span className="font-bold text-slate-900">"{font.textSnippets.join(', ')}"</span> 
                  识别为 <span className="font-bold text-amber-700">{font.primaryFont}</span>，但准确率可能不高。
                </p>
                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-amber-100/50">
                  <span className="text-slate-500 shrink-0 text-xs font-medium mt-0.5">建议尝试备选：</span>
                  <div className="flex flex-wrap gap-1.5">
                    {font.possibleAlternatives && font.possibleAlternatives.length > 0 ? (
                      font.possibleAlternatives.map((alt, i) => (
                        <span key={i} className="px-2 py-1 bg-white text-slate-700 rounded-lg font-semibold text-xs border border-slate-200">
                          {alt.fontName}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs mt-0.5">无备选字体推荐</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-sm">
        <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-blue-800 font-bold mb-1">识别完成</h4>
          <p className="text-blue-700 text-sm">共识别出 {groupedResults.length} 种主要字体，置信度均较高。</p>
        </div>
      </div>
    );
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
          共发现 {groupedResults.length} 种字体
        </span>
      </div>
      
      {renderSummary()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupedResults.map((result, index) => (
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
                字体识别精度：{result.confidence}
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
                <div className="space-y-2">
                  {result.textSnippets.map((snippet, idx) => (
                    <div key={idx} className="text-lg text-slate-800 font-medium leading-relaxed break-words">
                      {snippet.split(',').map((part, i, arr) => (
                        <span key={i}>
                          {part}
                          {i < arr.length - 1 && <span className="text-slate-400">,</span>}
                          {i < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <Layers size={18} />
                  <span className="text-sm font-bold uppercase tracking-wider">相似备选字体</span>
                </div>
                <div className="space-y-3">
                  {result.possibleAlternatives && result.possibleAlternatives.length > 0 ? (
                    result.possibleAlternatives.map((alt, i) => (
                      <div key={i} className="p-3.5 bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">{alt.fontName}</span>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getConfidenceColor(alt.confidence)}`}>
                            {getConfidenceIcon(alt.confidence)}
                            相似度：{alt.confidence}
                          </div>
                        </div>
                        {alt.licenseCheck && (
                          <div className={`mt-2 text-xs p-2.5 rounded-lg border ${alt.licenseCheck.isAllowed ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700' : 'bg-red-50/80 border-red-100 text-red-700'}`}>
                            <div className="flex items-center gap-1.5 mb-1 font-bold">
                              {alt.licenseCheck.isAllowed ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                              {alt.licenseCheck.isAllowed ? '允许使用' : '存在风险'}
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
