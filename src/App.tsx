import React, { useState, useRef, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageCropper } from './components/ImageCropper';
import { FontResults } from './components/FontResults';
import { extractFontsFromImage, detectTextRegions } from './services/aiService';
import { getLicenseDocuments, saveLicenseDocument, deleteLicenseDocument, LicenseDocument, saveHistoryRecord, HistoryRecord } from './services/dbService';
import { AIConfig, loadConfig } from './services/configService';
import { ConfigModal } from './components/ConfigModal';
import { AgentChat } from './components/AgentChat';
import { HistoryModal } from './components/HistoryModal';
import { Type, Sparkles, ScanText, AlertCircle, Shield, Upload, FileText, X, Trash2, Database, Settings, MessageSquareText, Clock, Crop, Focus } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

export default function App() {
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [croppedImage, setCroppedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingRegions, setIsDetectingRegions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textRegions, setTextRegions] = useState<{x: number, y: number, width: number, height: number}[] | null>(null);

  // AI 配置
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // 历史记录
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 智能体对话
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 版权核查状态
  const [brandName, setBrandName] = useState('');
  const [savedLicenses, setSavedLicenses] = useState<LicenseDocument[]>([]);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfig().then(setConfig);
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    try {
      const docs = await getLicenseDocuments();
      setSavedLicenses(docs);
    } catch (err) {
      console.error("Failed to load licenses:", err);
    }
  };

  const handleImageSelected = (base64: string, mimeType: string) => {
    setSelectedImage({ base64, mimeType });
    setCroppedImage(null);
    setIsCropping(false);
    setResults([]);
    setError(null);
    setTextRegions(null);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setIsCropping(false);
    setResults([]);
    setError(null);
    setTextRegions(null);
  };

  const handleLicenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
    const isTextOrPdf = file.type.includes('pdf') || file.type.includes('text') || file.name.endsWith('.md');

    if (!isExcel && !isTextOrPdf) {
      setError('请上传 PDF、文本文件 (txt, md) 或 Excel/CSV 表格。');
      return;
    }

    setIsUploadingLicense(true);
    setError(null);

    try {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        let combinedText = '';
        
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          if (csv.trim()) {
            combinedText += `\n--- 表格: ${sheetName} ---\n${csv}\n`;
          }
        });

        const blob = new Blob([combinedText], { type: 'text/plain;charset=utf-8' });
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            try {
              await saveLicenseDocument({
                base64: event.target.result as string,
                mimeType: 'text/plain',
                name: file.name + '.txt' // 转换为文本格式保存
              });
              await loadLicenses();
            } catch (err) {
              console.error("Failed to save license:", err);
              setError('保存授权文件失败。');
            } finally {
              setIsUploadingLicense(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }
          }
        };
        reader.readAsDataURL(blob);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            try {
              await saveLicenseDocument({
                base64: event.target.result as string,
                mimeType: file.type || 'text/plain',
                name: file.name
              });
              await loadLicenses();
            } catch (err) {
              console.error("Failed to save license:", err);
              setError('保存授权文件失败。');
            } finally {
              setIsUploadingLicense(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Failed to process file:", err);
      setError('处理文件时发生错误。');
      setIsUploadingLicense(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLicense = async (id: string) => {
    try {
      await deleteLicenseDocument(id);
      await loadLicenses();
    } catch (err) {
      console.error("Failed to delete license:", err);
      setError('删除文件失败。');
    }
  };

  const handleAutoDetectRegions = async () => {
    if (!selectedImage || !config) return;
    
    setIsDetectingRegions(true);
    setError(null);
    
    try {
      const regions = await detectTextRegions(selectedImage.base64, selectedImage.mimeType, config);
      if (regions && regions.length > 0) {
        setTextRegions(regions);
        setIsCropping(true); // Open cropper with detected regions
      } else {
        setError('未能自动检测到明显的文字区域，请手动裁剪或直接识别整图。');
        setIsCropping(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '自动检测文字区域失败。');
      setIsCropping(true); // Fallback to manual cropping
    } finally {
      setIsDetectingRegions(false);
    }
  };

  const handleExtract = async () => {
    const imageToProcess = croppedImage || selectedImage;
    if (!imageToProcess || !config) return;

    setIsLoading(true);
    setError(null);

    try {
      const extractedFonts = await extractFontsFromImage(
        imageToProcess.base64, 
        imageToProcess.mimeType,
        config,
        brandName.trim() !== '' ? brandName.trim() : undefined,
        savedLicenses.length > 0 ? savedLicenses : undefined,
        config.temperature
      );
      setResults(extractedFonts);

      // 保存到历史记录
      await saveHistoryRecord({
        image: imageToProcess,
        results: extractedFonts,
        brandName: brandName.trim() !== '' ? brandName.trim() : undefined,
        provider: config.provider
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析图片时发生错误，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadHistoryRecord = (record: HistoryRecord) => {
    setSelectedImage(record.image);
    setResults(record.results);
    if (record.brandName) {
      setBrandName(record.brandName);
    }
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!config) return null; // Wait for config to load

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900 relative">
      {/* 顶部导航栏 */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ScanText size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">字体提取器</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm transition-colors"
            >
              <Clock size={16} />
              <span className="hidden sm:inline">历史记录</span>
            </button>
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm transition-colors"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">AI 配置</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* 标题区域 */}
        <div className="text-center mb-16 relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              神秘<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">小工具</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              上传包含文字的图片，我们的 AI 将深度分析排版，精准识别所使用的字体及其设计特征。
            </p>
          </motion.div>
        </div>

        {/* 核心交互区 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-10 max-w-4xl mx-auto"
        >
          {isCropping && selectedImage ? (
            <ImageCropper
              imageSrc={selectedImage.base64}
              initialRegions={textRegions}
              onCropComplete={(croppedBase64) => {
                setCroppedImage({ base64: croppedBase64, mimeType: 'image/jpeg' });
                setIsCropping(false);
              }}
              onCancel={() => setIsCropping(false)}
            />
          ) : (
            <ImageUploader
              selectedImage={croppedImage?.base64 || selectedImage?.base64 || null}
              onImageSelected={handleImageSelected}
              onClear={handleClear}
            />
          )}

          {/* 版权核查区域 (可选) */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl -z-10 opacity-50 translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="text-indigo-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800">版权核查知识库 (可选)</h3>
                <span className="text-xs text-slate-400 font-medium ml-2 bg-slate-100 px-2 py-1 rounded-md">高级功能</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">客户品牌名称</label>
                <input 
                  type="text" 
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="例如：Acme Corp"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 hover:bg-white focus:bg-white"
                />
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  输入品牌名称，AI 将结合右侧的授权文件库，自动为您核查该品牌是否被允许使用识别出的字体。
                </p>
              </div>
              
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">授权/规则文件库</label>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    已存 {savedLicenses.length} 份
                  </span>
                </div>
                
                <div className="flex-grow bg-slate-50 rounded-xl border border-slate-200 p-3 overflow-y-auto max-h-[200px] space-y-2">
                  {savedLicenses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                      <Database size={24} className="mb-2 opacity-50" />
                      <span className="text-sm">知识库为空</span>
                    </div>
                  ) : (
                    savedLicenses.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-slate-100 shadow-sm group">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={16} className="text-blue-500 shrink-0" />
                          <span className="truncate text-sm font-medium text-slate-700">{doc.name}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteLicense(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          title="删除文件"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleLicenseFileChange}
                  accept=".pdf,.txt,.md,.xlsx,.xls,.csv"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLicense}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={16} />
                  <span className="text-sm font-medium">{isUploadingLicense ? '正在保存...' : '添加 PDF / TXT / Excel'}</span>
                </button>
              </div>
            </div>
          </div>

          {selectedImage && !results.length && !isLoading && !isCropping && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
            >
              <button
                onClick={handleAutoDetectRegions}
                disabled={isDetectingRegions}
                className="group flex items-center justify-center gap-2 bg-white border-2 border-indigo-200 hover:border-indigo-300 text-indigo-700 px-6 py-4 rounded-2xl font-semibold text-lg shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-70"
              >
                {isDetectingRegions ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Focus size={22} className="text-indigo-500 group-hover:text-indigo-600" />
                )}
                {isDetectingRegions ? '正在检测文字...' : '自动框选文字'}
              </button>
              <button
                onClick={() => setIsCropping(true)}
                className="group flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-4 rounded-2xl font-semibold text-lg shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
              >
                <Crop size={22} className="text-slate-500 group-hover:text-slate-700" />
                手动裁剪
              </button>
              <button
                onClick={handleExtract}
                className="group flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transition-all duration-300 active:scale-95"
              >
                <Sparkles size={22} className="text-blue-400 group-hover:animate-pulse" />
                {croppedImage ? '识别裁剪区域' : '识别整图'}
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm flex items-center gap-3"
            >
              <AlertCircle size={20} className="shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </motion.div>

        {/* 结果区域 (全宽) */}
        <FontResults results={results} isLoading={isLoading} />
      </main>

      {/* 悬浮聊天按钮 */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <MessageSquareText size={24} />
      </button>

      {/* 模态框和侧边栏 */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSave={(newConfig) => setConfig(newConfig)} 
      />
      
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadRecord={handleLoadHistoryRecord}
      />

      {isChatOpen && (
        <AgentChat 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          knowledgeBase={savedLicenses}
          config={config}
        />
      )}
    </div>
  );
}
