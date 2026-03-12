import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) {
      // If no crop selected, just return the original image
      onCropComplete(imageSrc);
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Calculate the actual dimensions of the crop on the original image
    const targetWidth = Math.floor(completedCrop.width * scaleX);
    const targetHeight = Math.floor(completedCrop.height * scaleY);
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Improve image quality
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      Math.floor(completedCrop.x * scaleX),
      Math.floor(completedCrop.y * scaleY),
      targetWidth,
      targetHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // Convert canvas to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.95);
    onCropComplete(base64Image);
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">裁剪图片</h3>
        <p className="text-sm text-slate-500">框选需要识别文字的区域，以提高准确率</p>
      </div>
      
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-200 flex justify-center items-center min-h-[300px] max-h-[60vh]">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          className="max-h-[60vh]"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop me"
            className="max-h-[60vh] w-auto object-contain"
            crossOrigin="anonymous"
          />
        </ReactCrop>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <X size={18} />
          取消裁剪
        </button>
        <button
          onClick={handleCropComplete}
          className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Check size={18} />
          确认裁剪
        </button>
      </div>
    </div>
  );
}
