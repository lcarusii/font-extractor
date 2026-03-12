import React, { useState, useEffect } from 'react';
import { HistoryRecord, getHistoryRecords, deleteHistoryRecord, clearHistoryRecords } from '../services/dbService';
import { X, Clock, Trash2, ChevronRight, Image as ImageIcon, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRecord: (record: HistoryRecord) => void;
}

export function HistoryModal({ isOpen, onClose, onLoadRecord }: HistoryModalProps) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen]);

  const loadRecords = async () => {
    const data = await getHistoryRecords();
    setRecords(data);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistoryRecord(id);
    await loadRecords();
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      await clearHistoryRecords();
      await loadRecords();
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2 text-slate-800">
              <Clock size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold">识别历史记录</h2>
              <span className="text-xs font-medium text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full ml-2">
                {records.length} 条
              </span>
            </div>
            <div className="flex items-center gap-2">
              {records.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  清空全部
                </button>
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
            {records.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">暂无历史记录</p>
                <p className="text-xs mt-1 opacity-70">您识别过的字体将会显示在这里</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <div 
                    key={record.id}
                    onClick={() => {
                      onLoadRecord(record);
                      onClose();
                    }}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {record.image ? (
                        <img src={record.image.base64} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-slate-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-400">{formatDate(record.timestamp)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                          {record.provider === 'gemini' ? 'Gemini' : 'OpenAI'}
                        </span>
                      </div>
                      <div className="truncate font-bold text-slate-800 mb-1">
                        {record.results.map(r => r.primaryFont).join(', ') || '未识别出字体'}
                      </div>
                      {record.brandName && (
                        <div className="text-xs text-slate-500 truncate">
                          品牌核查: <span className="font-medium text-slate-700">{record.brandName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 pl-2">
                      <button 
                        onClick={(e) => handleDelete(e, record.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="删除记录"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
