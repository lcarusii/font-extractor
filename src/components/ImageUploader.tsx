import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertTriangle } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

export function ImageUploader({ onImageSelected, selectedImage, onClear }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.onload = () => {
        // Check if image resolution is too low (e.g., less than 400px on either side)
        if (img.width < 400 || img.height < 400) {
          setWarning(`当前图片分辨率较低 (${img.width}x${img.height})，可能会影响 AI 识别的准确率。建议重新上传更高清的图片，或使用下方“裁剪图片”功能仅框选文字区域。`);
        } else {
          setWarning(null);
        }
      };
      img.src = selectedImage;
    } else {
      setWarning(null);
    }
  }, [selectedImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onImageSelected(event.target.result as string, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }, []);

  if (selectedImage) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white group">
          <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
          <img src={selectedImage} alt="已选择的图片" className="w-full h-auto max-h-[60vh] object-contain bg-slate-50/50" />
          <button
            onClick={onClear}
            className="absolute top-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-20 hover:scale-105 active:scale-95"
            title="清除图片"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        
        {warning && (
          <div className="flex items-start gap-3 text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-sm shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-500" />
            <p className="leading-relaxed font-medium">{warning}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full max-w-3xl mx-auto border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ease-out cursor-pointer flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden
        ${isDragging 
          ? 'border-blue-500 bg-blue-50/50 scale-[1.02] shadow-xl shadow-blue-100' 
          : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 hover:shadow-md'}`}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input
        id="file-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
      
      <div className={`w-20 h-20 mb-6 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
        <UploadCloud size={36} strokeWidth={1.5} />
      </div>
      
      <h3 className="text-2xl font-semibold text-slate-800 mb-3">上传图片</h3>
      <p className="text-slate-500 mb-8 max-w-md text-base leading-relaxed">
        将包含文字的图片拖放到此处，或点击浏览本地文件。我们将为您提取并分析其中的字体。
      </p>
      
      <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-100/50 px-4 py-2 rounded-full">
        <ImageIcon size={16} />
        <span>支持 JPG, PNG, WebP 格式</span>
      </div>
    </div>
  );
}
