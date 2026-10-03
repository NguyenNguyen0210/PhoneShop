import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { reviewService } from '../../../services/reviewService';

export interface ReviewImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ReviewImageUploader: React.FC<ReviewImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 5,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFiles = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`Bạn đã đạt giới hạn tối đa ${maxImages} hình ảnh.`);
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      setErrorMessage(
        `Bạn chỉ có thể tải lên thêm ${remainingSlots} hình ảnh (tối đa ${maxImages} ảnh).`,
      );
      return;
    }

    // Validate mime types
    const invalidType = selectedFiles.some(
      (file) => !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()),
    );
    if (invalidType) {
      setErrorMessage('Chỉ hỗ trợ định dạng JPG, PNG hoặc WebP.');
      return;
    }

    // Validate file sizes
    const invalidSize = selectedFiles.some((f) => f.size > 5 * 1024 * 1024);
    if (invalidSize) {
      setErrorMessage('Mỗi hình ảnh không được vượt quá 5MB.');
      return;
    }

    setErrorMessage(null);
    setUploading(true);

    try {
      const uploadedUrls = await reviewService.uploadReviewImages(selectedFiles);
      onChange([...images, ...uploadedUrls]);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        errorObj.response?.data?.message || 'Không thể tải ảnh lên. Vui lòng thử lại sau.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading && images.length < maxImages) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading || images.length >= maxImages) return;

    const files = Array.from(e.dataTransfer.files || []);
    await processFiles(files);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-wrap items-center gap-3 p-2 rounded-2xl transition-colors ${
          isDragOver ? 'bg-blue-50/80 border-2 border-dashed border-blue-400' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {images.map((url, index) => (
          <div
            key={url + index}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 group bg-slate-50 shadow-xs"
          >
            <img
              src={url}
              alt={`Ảnh đánh giá ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-opacity opacity-90 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label={`Xóa ảnh ${index + 1}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Tải ảnh lên"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium font-mono">
                  {images.length}/{maxImages}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {errorMessage && (
        <p className="text-xs text-red-500 font-medium">{errorMessage}</p>
      )}
      <p className="text-[11px] text-slate-400">
        Định dạng hỗ trợ: JPG, PNG, WebP (Tối đa {maxImages} ảnh, dưới 5MB/ảnh). Kéo thả ảnh vào đây để tải lên.
      </p>
    </div>
  );
};

export default ReviewImageUploader;
