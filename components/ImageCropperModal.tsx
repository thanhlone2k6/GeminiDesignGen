
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadedImage } from '../types';
import { CROP_RATIOS } from '../constants';

interface ImageCropperModalProps {
  image: UploadedImage | null;
  aspectRatio: number; // Passed from parent (e.g. 16/9 or 0 for free)
  onConfirm: (croppedImage: UploadedImage) => void;
  onCancel: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ image, aspectRatio: initialRatio, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Crop Logic State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); 
  const [selectedRatio, setSelectedRatio] = useState<number>(initialRatio); 

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Load image
  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = `data:${image.mimeType};base64,${image.base64}`;
      img.onload = () => {
        setImgElement(img);
        if (initialRatio === 0) {
           setSelectedRatio(0);
        } else {
           setSelectedRatio(initialRatio);
        }
        setRotation(0);
        setPosition({x: 0, y:0});
        setScale(1);
      };
    }
  }, [image, initialRatio]);

  // Rotate handler
  const rotateLeft = () => setRotation(r => (r - 90 + 360) % 360);
  const rotateRight = () => setRotation(r => (r + 90) % 360);

  // Helper: Get visual constraints based on canvas size, ratio, and image rotation
  const getConstraints = useCallback(() => {
    if (!canvasRef.current || !imgElement) return null;
    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;

    const padding = 20; // Reduce padding for mobile
    const availW = cw - padding * 2;
    const availH = ch - padding * 2;
    
    const isRotated = rotation % 180 !== 0;
    const imgAspect = isRotated ? imgElement.height / imgElement.width : imgElement.width / imgElement.height;
    
    const effectiveRatio = selectedRatio === 0 ? imgAspect : selectedRatio;

    let boxW, boxH;
    if (effectiveRatio > availW / availH) {
      boxW = availW;
      boxH = boxW / effectiveRatio;
    } else {
      boxH = availH;
      boxW = boxH * effectiveRatio;
    }

    const imgW = isRotated ? imgElement.height : imgElement.width;
    const imgH = isRotated ? imgElement.width : imgElement.height;

    const minScaleX = boxW / imgW;
    const minScaleY = boxH / imgH;
    const minScale = Math.max(minScaleX, minScaleY);

    return {
      cw, ch, boxW, boxH, boxX: (cw - boxW)/2, boxY: (ch - boxH)/2,
      imgW, imgH, minScale
    };
  }, [imgElement, selectedRatio, rotation]);

  useEffect(() => {
    const c = getConstraints();
    if (c) {
      setScale(prev => Math.max(prev, c.minScale));
    }
  }, [getConstraints]);

  useEffect(() => {
    const c = getConstraints();
    if (c) {
      setScale(c.minScale);
      setPosition({ x: 0, y: 0 });
    }
  }, [selectedRatio, rotation]); 

  // Draw loop
  useEffect(() => {
    const constraints = getConstraints();
    if (!canvasRef.current || !imgElement || !constraints) return;

    const { cw, ch, boxW, boxH, boxX, boxY, minScale } = constraints;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#020617'; 
    ctx.fillRect(0, 0, cw, ch);

    // --- DRAW IMAGE ---
    ctx.save();
    
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.clip();

    const activeScale = Math.max(scale, minScale);
    
    const isRotated = rotation % 180 !== 0;
    const renderW = (isRotated ? imgElement.height : imgElement.width) * activeScale;
    const renderH = (isRotated ? imgElement.width : imgElement.height) * activeScale;

    const maxDX = Math.max(0, (renderW - boxW) / 2);
    const maxDY = Math.max(0, (renderH - boxH) / 2);

    const clampedX = Math.max(-maxDX, Math.min(maxDX, position.x));
    const clampedY = Math.max(-maxDY, Math.min(maxDY, position.y));

    const cx = boxX + boxW / 2 + clampedX;
    const cy = boxY + boxH / 2 + clampedY;

    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(activeScale, activeScale);

    ctx.drawImage(imgElement, -imgElement.width / 2, -imgElement.height / 2);

    ctx.restore();

    // --- OVERLAY ---
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, cw, boxY); // Top
    ctx.fillRect(0, boxY + boxH, cw, ch - (boxY + boxH)); // Bottom
    ctx.fillRect(0, boxY, boxX, boxH); // Left
    ctx.fillRect(boxX + boxW, boxY, cw - (boxX + boxW), boxH); // Right

    // --- BORDER & GRID ---
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + boxW / 3, boxY);
    ctx.lineTo(boxX + boxW / 3, boxY + boxH);
    ctx.moveTo(boxX + 2 * boxW / 3, boxY);
    ctx.lineTo(boxX + 2 * boxW / 3, boxY + boxH);
    ctx.moveTo(boxX, boxY + boxH / 3);
    ctx.lineTo(boxX + boxW, boxY + boxH / 3);
    ctx.moveTo(boxX, boxY + 2 * boxH / 3);
    ctx.lineTo(boxX + boxW, boxY + 2 * boxH / 3);
    ctx.stroke();

  }, [imgElement, scale, position, rotation, getConstraints]);

  // Input Handlers
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
     if (isDragging) {
      const constraints = getConstraints();
      if (!constraints) return;
      
      const { minScale, boxW, boxH, imgW, imgH } = constraints;
      const activeScale = Math.max(scale, minScale);
      
      const rawX = clientX - dragStart.x;
      const rawY = clientY - dragStart.y;

      const renderW = imgW * activeScale;
      const renderH = imgH * activeScale;
      const maxDX = Math.max(0, (renderW - boxW) / 2);
      const maxDY = Math.max(0, (renderH - boxH) / 2);
      
      const clampedX = Math.max(-maxDX, Math.min(maxDX, rawX));
      const clampedY = Math.max(-maxDY, Math.min(maxDY, rawY));

      setPosition({ x: clampedX, y: clampedY });
    }
  };

  const handleEnd = () => setIsDragging(false);

  // Mouse
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleMouseUp = () => handleEnd();

  // Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
       handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
       handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchEnd = () => handleEnd();

  const handleWheel = (e: React.WheelEvent) => {
    const constraints = getConstraints();
    if (!constraints) return;
    
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(constraints.minScale, Math.min(10, scale + delta));
    setScale(newScale);
  };

  const handleSave = () => {
    if (!imgElement || !image) return;
    const constraints = getConstraints();
    if (!constraints) return;

    const { minScale, boxW, boxH, imgW, imgH } = constraints;
    
    const targetWidth = 1500; 
    const effectiveRatio = boxW / boxH; 
    const targetHeight = targetWidth / effectiveRatio;
    
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetWidth;
    outCanvas.height = targetHeight;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const outputRatio = targetWidth / boxW;
    const activeScale = Math.max(scale, minScale);
    const finalRenderScale = activeScale * outputRatio;

    const renderW = imgW * activeScale;
    const renderH = imgH * activeScale;
    const maxDX = Math.max(0, (renderW - boxW) / 2);
    const maxDY = Math.max(0, (renderH - boxH) / 2);
    const clampedX = Math.max(-maxDX, Math.min(maxDX, position.x));
    const clampedY = Math.max(-maxDY, Math.min(maxDY, position.y));

    const cx = targetWidth / 2 + clampedX * outputRatio;
    const cy = targetHeight / 2 + clampedY * outputRatio;

    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(finalRenderScale, finalRenderScale);
    ctx.drawImage(imgElement, -imgElement.width / 2, -imgElement.height / 2);

    const base64 = outCanvas.toDataURL('image/jpeg', 0.95);
    const cleanBase64 = base64.split(',')[1];
    
    onConfirm({
      ...image,
      base64: cleanBase64,
      mimeType: 'image/jpeg'
    });
  };

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-6">
      <div className="flex flex-col gap-0 rounded-2xl bg-slate-900 shadow-2xl w-full h-full sm:max-w-[95vw] sm:max-h-[92vh] border border-slate-700 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700 bg-slate-800 z-10 shrink-0">
           <h3 className="font-bold text-base sm:text-lg text-white">Chỉnh sửa ảnh</h3>
           <div className="flex gap-2 items-center">
             <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold">Tỉ lệ:</span>
                <select 
                  value={selectedRatio} 
                  onChange={(e) => setSelectedRatio(parseFloat(e.target.value))}
                  className="bg-slate-700 text-white text-xs py-2 px-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-brand-500 outline-none hover:bg-slate-600 transition"
                >
                  {CROP_RATIOS.map(r => (
                    <option key={r.label} value={r.value}>{r.label}</option>
                  ))}
                </select>
             </div>
             <button onClick={onCancel} className="h-8 w-8 rounded-full bg-slate-700 text-gray-300 hover:bg-red-500 hover:text-white flex items-center justify-center transition">✕</button>
           </div>
        </div>
        
        {/* CANVAS AREA */}
        <div className="relative flex-1 bg-black overflow-hidden cursor-move touch-none flex items-center justify-center select-none"
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
             onWheel={handleWheel}
        >
          <canvas 
            ref={canvasRef} 
            width={1600} 
            height={1000} 
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* FOOTER CONTROLS */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-4 z-10 shrink-0">
          
          <div className="flex items-center justify-between gap-2">
             <div className="flex gap-2">
                <button onClick={rotateLeft} className="p-2.5 rounded-xl bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white transition shadow-sm border border-slate-600">
                  ↺
                </button>
                <button onClick={rotateRight} className="p-2.5 rounded-xl bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white transition shadow-sm border border-slate-600">
                  ↻
                </button>
             </div>

             {/* Mobile Ratio Select */}
             <div className="sm:hidden flex-1 max-w-[150px]">
                <select 
                  value={selectedRatio} 
                  onChange={(e) => setSelectedRatio(parseFloat(e.target.value))}
                  className="w-full bg-slate-700 text-white text-sm py-2.5 px-3 rounded-xl border border-slate-600"
                >
                  {CROP_RATIOS.map(r => (
                    <option key={r.label} value={r.value}>{r.label}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-6 py-3 rounded-xl bg-slate-700 text-gray-300 font-semibold hover:bg-slate-600 transition border border-slate-600 text-sm">
              Hủy
            </button>
            <button onClick={handleSave} className="flex-1 px-8 py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition active:scale-95 text-sm">
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
