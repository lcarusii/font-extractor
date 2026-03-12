import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Crop as CropIcon, Check } from 'lucide-react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

export function ImageUploader({ onImageSelected, selectedImage, onClear }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [originalFile, setOriginalFile] = useState<{ base64: string; mimeType: string } | null>(null);

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
        const base64 = event.target.result as string;
        setOriginalFile({ base64, mimeType: file.type });
        setIsCropping(true);
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

  const getCroppedImg = (image: HTMLImageElement, crop: Crop, mimeType: string): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return Promise.reject(new Error('No 2d context'));
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          return Promise.reject(new Error('Canvas is empty'));
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      }, mimeType);
    });
  };

  const handleConfirmCrop = async () => {
    if (!originalFile) return;
    
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
      try {
        const croppedBase64 = await getCroppedImg(imgRef.current, completedCrop, originalFile.mimeType);
        onImageSelected(croppedBase64, originalFile.mimeType);
        setIsCropping(false);
      } catch (e) {
        console.error('Crop failed', e);
        // Fallback to original
        onImageSelected(originalFile.base64, originalFile.mimeType);
        setIsCropping(false);
      }
    } else {
      // No crop selected, use full image
      onImageSelected(originalFile.base64, originalFile.mimeType);
      setIsCropping(false);
    }
  };

  const handleUseFullImage = () => {
    if (!originalFile) return;
    onImageSelected(originalFile.base64, originalFile.mimeType);
    setIsCropping(false);
  };

  const handleClearAll = () => {
    setOriginalFile(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setIsCropping(false);
    onClear();
  };

  if (isCropping && originalFile) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <CropIcon size={20} className="text-blue-500" />
            <span>框选需要识别的文字区域（可选）</span>
          </div>
          <button
            onClick={handleClearAll}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 bg-slate-100/50 flex items-center justify-center min-h-[400px] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            className="max-h-[60vh] shadow-md rounded-lg overflow-hidden bg-white"
          >
            <img
              ref={imgRef}
              src={originalFile.base64}
              alt="Crop me"
              className="max-h-[60vh] w-auto object-contain"
            />
          </ReactCrop>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={handleUseFullImage}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
          >
            识别整图
          </button>
          <button
            onClick={handleConfirmCrop}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-2"
          >
            <Check size={18} />
            确认选区并识别
          </button>
        </div>
      </div>
    );
  }

  if (selectedImage) {
    return (
      <div className="relative w-full max-w-3xl mx-auto rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white group">
        <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
        <img src={selectedImage} alt="已选择的图片" className="w-full h-auto max-h-[60vh] object-contain bg-slate-50/50" />
        <button
          onClick={handleClearAll}
          className="absolute top-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-20 hover:scale-105 active:scale-95"
          title="清除图片"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
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
        将包含文字的图片拖放到此处，或点击浏览本地文件。上传后可框选需要识别的文字区域。
      </p>
      
      <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-100/50 px-4 py-2 rounded-full">
        <ImageIcon size={16} />
        <span>支持 JPG, PNG, WebP 格式</span>
      </div>
    </div>
  );
}
