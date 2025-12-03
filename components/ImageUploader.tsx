
import React, { useRef, useState, useCallback } from 'react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesSelected: (newImages: UploadedImage[]) => void;
  onRemoveImage: (id: string) => void;
  onClearAll: () => void;
  maxImages?: number;
  label?: string;
  placeholder?: string;
  cropAspectRatio?: number;
  onCrop?: (img: UploadedImage, cb: (cropped: UploadedImage) => void) => void; 
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onImagesSelected, 
  onRemoveImage, 
  onClearAll,
  maxImages,
  label,
  placeholder = "Thêm Ảnh",
  cropAspectRatio,
  onCrop
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(file => file.type.startsWith('image/'));

    if (validFiles.length === 0) return;

    try {
      const promises = validFiles.map(file => {
        return new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.includes('base64,') 
              ? base64String.split('base64,')[1] 
              : base64String;

            resolve({
              id: Math.random().toString(36).substr(2, 9),
              base64: base64Data,
              mimeType: file.type
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const newImages = await Promise.all(promises);
      
      if (onCrop && cropAspectRatio !== undefined && newImages.length > 0) {
        onCrop(newImages[0], (cropped) => {
             if (maxImages === 1) {
               onImagesSelected([cropped]);
             } else {
               onImagesSelected([cropped]);
             }
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (maxImages === 1) {
        onImagesSelected([newImages[0]]);
      } else {
        onImagesSelected(newImages);
      }
      
    } catch (error) {
      console.error("Error reading files:", error);
      alert("Có lỗi xảy ra khi đọc file ảnh. Vui lòng thử lại.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, []);

  const isSingleMode = maxImages === 1;

  const handleImageClick = (img: UploadedImage) => {
    if (onCrop) {
      onCrop(img, (cropped) => {
        if (maxImages === 1) {
           onImagesSelected([cropped]);
        } else {
           onRemoveImage(img.id);
           onImagesSelected([cropped]);
        }
      });
    }
  };

  return (
    <div className="w-full">
      {label && <div className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">{label}</div>}
      
      {!isSingleMode && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            {images.length > 0 ? `${images.length} SELECTED` : 'EMPTY'}
          </span>
          {images.length > 0 && (
            <button 
              onClick={onClearAll}
              className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wide"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Grid Adjustment: Bigger images (grid-cols-2 for single/small, 3 for large) */}
      {/* UPDATE: User requested much larger images. Changing to grid-cols-1 sm:grid-cols-2 */}
      <div className={`grid gap-3 ${isSingleMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((img) => (
          <div 
            key={img.id} 
            onClick={() => handleImageClick(img)}
            className={`group relative aspect-square overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm transition-all hover:scale-[1.01] ${onCrop ? 'cursor-pointer' : ''}`}
            title={onCrop ? "Bấm để chỉnh sửa" : ""}
          >
            <img
              src={`data:${img.mimeType};base64,${img.base64}`}
              alt="Uploaded"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            
            {onCrop && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md border border-white/20">EDIT</span>
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onRemoveImage(img.id); }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 scale-90 hover:scale-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
        
        {(!isSingleMode || images.length === 0) && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed
              transition-all duration-300 backdrop-blur-sm
              ${isDragging 
                ? 'border-brand-500 bg-brand-500/20 scale-105 animate-pulse' 
                : 'border-white/20 bg-white/5 hover:border-brand-400 hover:bg-white/10 hover:shadow-inner'
              }
            `}
            style={{ minHeight: '150px' }}
          >
            <div className={`rounded-full p-3 mb-2 transition-colors ${isDragging ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-400'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
               </svg>
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${isDragging ? 'text-brand-300' : 'text-slate-500'}`}>
              {isDragging ? 'DROP HERE' : placeholder}
            </span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple={!isSingleMode}
        accept="image/png, image/jpeg, image/webp, image/heic"
      />
    </div>
  );
};
