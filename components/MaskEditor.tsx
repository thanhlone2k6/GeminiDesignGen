
import React, { useRef, useState, useEffect } from 'react';
import { UploadedImage } from '../types';

interface MaskEditorProps {
  image: UploadedImage;
  onSave: (editedImage: UploadedImage, maskImage: UploadedImage, isOutpaint?: boolean, isSuperZoom?: boolean) => void;
  onCancel: () => void;
  isUpscaleMode?: boolean;
}

type EditorTool = 'brush' | 'eraser' | 'superzoom';

export const MaskEditor: React.FC<MaskEditorProps> = ({ image, onSave, onCancel, isUpscaleMode = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Tools State
  const [activeTool, setActiveTool] = useState<EditorTool>('brush');
  const [brushSize, setBrushSize] = useState(50);
  const [brushHardness, setBrushHardness] = useState(100); // 0 (Soft) to 100 (Hard)
  
  const [showMask, setShowMask] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);

  // Cursor Tracking
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  // Canvas State
  const [canvasDimensions, setCanvasDimensions] = useState({ w: 0, h: 0 });
  
  // Offscreen Canvas for Mask
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize
  useEffect(() => {
    const img = new Image();
    img.src = `data:${image.mimeType};base64,${image.base64}`;
    img.onload = () => {
      setImgElement(img);
      setCanvasDimensions({ w: img.width, h: img.height });
      
      // Initialize Mask Canvas (Black = Keep, White = Edit)
      const mc = document.createElement('canvas');
      mc.width = img.width;
      mc.height = img.height;
      const mCtx = mc.getContext('2d');
      if (mCtx) {
        mCtx.fillStyle = 'black'; 
        mCtx.fillRect(0, 0, mc.width, mc.height);
      }
      maskCanvasRef.current = mc;
    };
  }, [image]);

  // Canvas Setup & Render Loop
  useEffect(() => {
    if (!canvasRef.current || !imgElement || !maskCanvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Resize canvas to match image dimensions
    if (canvas.width !== canvasDimensions.w || canvas.height !== canvasDimensions.h) {
        canvas.width = canvasDimensions.w;
        canvas.height = canvasDimensions.h;
    }

    const context = canvas.getContext('2d');
    setCtx(context);
    
    renderCanvas();
  }, [imgElement, canvasDimensions, showMask, activeTool]); // Re-render when dependencies change

  const renderCanvas = () => {
    if (!canvasRef.current || !ctx || !imgElement || !maskCanvasRef.current) return;
    
    // 1. Clear & Draw Original Image
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Center image if canvas is larger (outpainting scenario)
    const dx = (canvasDimensions.w - imgElement.width) / 2;
    const dy = (canvasDimensions.h - imgElement.height) / 2;
    
    ctx.drawImage(imgElement, dx, dy);

    // 2. Draw Mask Overlay
    if (showMask) {
       const temp = document.createElement('canvas');
       temp.width = canvasDimensions.w;
       temp.height = canvasDimensions.h;
       const tCtx = temp.getContext('2d');
       if(tCtx) {
          // Draw the mask data
          tCtx.drawImage(maskCanvasRef.current, 0, 0);
          
          // Colorize the mask
          tCtx.globalCompositeOperation = 'source-in';
          if (activeTool === 'superzoom') {
             // Super Zoom: Green tint
             tCtx.fillStyle = 'rgba(16, 185, 129, 0.4)'; // Emerald-500
          } else {
             // Edit/Erase: Red tint
             tCtx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red-500
          }
          tCtx.fillRect(0, 0, temp.width, temp.height);
       }
       
       // Draw colored mask on top of image
       ctx.drawImage(temp, 0, 0);
    }
  };

  // --- DRAWING LOGIC (Using Pointer Events for Touch Support) ---
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const drawMask = (x: number, y: number) => {
    if (!maskCanvasRef.current) return;
    const mCtx = maskCanvasRef.current.getContext('2d');
    if (!mCtx) return;

    // Determine color: Eraser paints Black (Keep), Others paint White (Edit)
    const isEraser = activeTool === 'eraser';
    
    if (brushHardness >= 95) {
        // HARD BRUSH
        mCtx.beginPath();
        mCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        mCtx.fillStyle = isEraser ? 'black' : 'white'; 
        mCtx.fill();
    } else {
        // SOFT BRUSH (Gradient)
        const radius = brushSize / 2;
        const innerRadius = radius * (brushHardness / 100);
        
        const g = mCtx.createRadialGradient(x, y, innerRadius, x, y, radius);
        
        // Color configuration
        const color = isEraser ? '0,0,0' : '255,255,255';
        g.addColorStop(0, `rgba(${color}, 1)`); // Solid center
        g.addColorStop(1, `rgba(${color}, 0)`); // Transparent edge
        
        mCtx.fillStyle = g;
        // Draw a rect containing the gradient circle
        mCtx.fillRect(x - radius, y - radius, brushSize, brushSize);
    }

    renderCanvas();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const { x, y } = getPointerPos(e);
    drawMask(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Update visual cursor position
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCursorPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }

    if (!isDrawing) return;
    
    const { x, y } = getPointerPos(e);
    drawMask(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
      setIsHovering(false);
      setIsDrawing(false);
  };

  // --- ACTIONS ---
  const handleOutpaint = (direction: 'top' | 'bottom' | 'left' | 'right') => {
    if (!maskCanvasRef.current || !imgElement) return;
    const expandAmount = 512; 
    const oldW = canvasDimensions.w;
    const oldH = canvasDimensions.h;
    
    let newW = oldW;
    let newH = oldH;
    let offsetX = 0;
    let offsetY = 0;

    if (direction === 'top') { newH += expandAmount; offsetY = expandAmount; }
    if (direction === 'bottom') { newH += expandAmount; }
    if (direction === 'left') { newW += expandAmount; offsetX = expandAmount; }
    if (direction === 'right') { newW += expandAmount; }

    const newMaskCanvas = document.createElement('canvas');
    newMaskCanvas.width = newW;
    newMaskCanvas.height = newH;
    const nmCtx = newMaskCanvas.getContext('2d');
    if (nmCtx) {
       nmCtx.fillStyle = 'white'; 
       nmCtx.fillRect(0, 0, newW, newH);
       nmCtx.drawImage(maskCanvasRef.current, offsetX, offsetY);
    }
    maskCanvasRef.current = newMaskCanvas;
    setCanvasDimensions({ w: newW, h: newH });
  };

  const handleClearMask = () => {
    if (!maskCanvasRef.current) return;
    const mCtx = maskCanvasRef.current.getContext('2d');
    if (mCtx) {
      mCtx.fillStyle = 'black';
      mCtx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      renderCanvas();
    }
  };

  const handleInvertMask = () => {
    if (!maskCanvasRef.current) return;
    const mCtx = maskCanvasRef.current.getContext('2d');
    if (mCtx) {
       mCtx.globalCompositeOperation = 'difference';
       mCtx.fillStyle = 'white';
       mCtx.fillRect(0,0, maskCanvasRef.current.width, maskCanvasRef.current.height);
       mCtx.globalCompositeOperation = 'source-over';
       renderCanvas();
    }
  };

  const handleExport = () => {
    if (!maskCanvasRef.current || !imgElement) return;
    
    if (activeTool === 'superzoom') {
        const mCtx = maskCanvasRef.current.getContext('2d');
        if (!mCtx) return;
        const width = maskCanvasRef.current.width;
        const height = maskCanvasRef.current.height;
        const imgData = mCtx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasPixels = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx] > 128) { 
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    hasPixels = true;
                }
            }
        }

        if (!hasPixels) {
            alert("Vui lòng tô vùng cần Zoom vào (dùng công cụ Super Zoom).");
            return;
        }

        const padding = 20;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(width, maxX + padding);
        maxY = Math.min(height, maxY + padding);
        
        const cropW = maxX - minX;
        const cropH = maxY - minY;

        const targetSize = 1024; 
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetSize;
        outCanvas.height = targetSize;
        const oCtx = outCanvas.getContext('2d');
        if (!oCtx) return;

        oCtx.fillStyle = 'black';
        oCtx.fillRect(0, 0, targetSize, targetSize);

        const scaleFactor = Math.min((targetSize * 0.7) / cropW, (targetSize * 0.7) / cropH);
        const finalW = cropW * scaleFactor;
        const finalH = cropH * scaleFactor;
        const dx = (targetSize - finalW) / 2;
        const dy = (targetSize - finalH) / 2;

        oCtx.drawImage(imgElement, minX, minY, cropW, cropH, dx, dy, finalW, finalH);
        
        const maskOut = document.createElement('canvas');
        maskOut.width = targetSize;
        maskOut.height = targetSize;
        const moCtx = maskOut.getContext('2d');
        if (!moCtx) return;

        moCtx.fillStyle = 'white'; 
        moCtx.fillRect(0,0, targetSize, targetSize);
        moCtx.fillStyle = 'black'; 
        moCtx.fillRect(dx, dy, finalW, finalH);

        const base64Img = outCanvas.toDataURL('image/png').split(',')[1];
        const base64Mask = maskOut.toDataURL('image/png').split(',')[1];

        onSave(
            { id: 'zoom-base', base64: base64Img, mimeType: 'image/png' },
            { id: 'zoom-mask', base64: base64Mask, mimeType: 'image/png' },
            false,
            true 
        );

    } else {
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = canvasDimensions.w;
        baseCanvas.height = canvasDimensions.h;
        const bCtx = baseCanvas.getContext('2d');
        if (!bCtx) return;
        
        bCtx.fillStyle = 'black'; 
        bCtx.fillRect(0,0, baseCanvas.width, baseCanvas.height);
        
        const imgX = (canvasDimensions.w - imgElement.width) / 2;
        const imgY = (canvasDimensions.h - imgElement.height) / 2;
        bCtx.drawImage(imgElement, imgX, imgY);
        
        const base64Img = baseCanvas.toDataURL('image/png').split(',')[1];
        const base64Mask = maskCanvasRef.current.toDataURL('image/png').split(',')[1];
        
        const isOutpaint = canvasDimensions.w > imgElement.width || canvasDimensions.h > imgElement.height;
        
        onSave(
            { id: 'edit-base', base64: base64Img, mimeType: 'image/png' },
            { id: 'edit-mask', base64: base64Mask, mimeType: 'image/png' },
            isOutpaint,
            false
        );
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white select-none fixed inset-0 z-50">
       {/* Toolbar - Responsive Layout */}
       <div className="flex flex-col border-b border-slate-700 bg-slate-800 px-3 py-3 gap-3 shrink-0">
          
          {/* Scrollable container for small screens */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
             
             {/* TOOLS GROUP */}
             <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg shrink-0">
                <button 
                  onClick={() => setActiveTool('brush')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${activeTool === 'brush' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-slate-600'}`}
                >
                  🖌️ Brush
                </button>
                <button 
                  onClick={() => setActiveTool('eraser')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${activeTool === 'eraser' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-slate-600'}`}
                >
                  🧹 Eraser
                </button>
                {!isUpscaleMode && (
                   <button 
                     onClick={() => { setActiveTool('superzoom'); handleClearMask(); }}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${activeTool === 'superzoom' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-slate-600'}`}
                   >
                     🔍 Zoom
                   </button>
                )}
             </div>

             {/* SETTINGS GROUP */}
             <div className="flex items-center gap-4 shrink-0">
                {/* Size */}
                <div className="flex flex-col gap-1 w-24">
                   <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
                      <span>Size</span>
                      <span>{brushSize}</span>
                   </div>
                   <input 
                     type="range" min="5" max="300" 
                     value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
                     className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600 accent-brand-500"
                   />
                </div>
                
                {/* Hardness */}
                <div className="flex flex-col gap-1 w-24">
                   <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
                      <span>Hardness</span>
                      <span>{brushHardness}</span>
                   </div>
                   <input 
                     type="range" min="0" max="100" 
                     value={brushHardness} onChange={(e) => setBrushHardness(Number(e.target.value))}
                     className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600 accent-blue-500"
                   />
                </div>
             </div>

             {/* UTILS GROUP */}
             <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleInvertMask} className="rounded px-2.5 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 border border-slate-600 transition" title="Đảo ngược">Invert</button>
                <button onClick={handleClearMask} className="rounded px-2.5 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 border border-slate-600 transition" title="Xóa">Clear</button>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none bg-slate-700 px-2.5 py-1.5 rounded border border-slate-600 hover:bg-slate-600 whitespace-nowrap">
                    <input type="checkbox" checked={showMask} onChange={e => setShowMask(e.target.checked)} className="rounded accent-brand-500" />
                    👁️
                </label>
             </div>
          </div>
       </div>

       {/* Canvas Area with Touch Support */}
       <div 
         ref={containerRef}
         className="relative flex-1 overflow-hidden bg-[#0f172a] flex items-center justify-center p-4 cursor-crosshair touch-none"
         style={{ touchAction: 'none' }} // Critical for preventing scroll on mobile
         onPointerEnter={handleMouseEnter}
         onPointerLeave={handleMouseLeave}
       >
          <div className="relative shadow-2xl border border-slate-700 box-content" style={{ width: 'fit-content', height: 'fit-content' }}>
             
             {/* Outpaint Directions */}
             {!isUpscaleMode && activeTool !== 'superzoom' && (
                <>
                  <button onClick={() => handleOutpaint('top')} className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 hover:bg-brand-600 px-3 py-1 rounded-t text-gray-300 hover:text-white border border-slate-700 border-b-0 transition z-20">Expand Top</button>
                  <button onClick={() => handleOutpaint('bottom')} className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 hover:bg-brand-600 px-3 py-1 rounded-b text-gray-300 hover:text-white border border-slate-700 border-t-0 transition z-20">Expand Bottom</button>
                  <button onClick={() => handleOutpaint('left')} className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-[10px] bg-slate-800 hover:bg-brand-600 px-3 py-1 rounded-t text-gray-300 hover:text-white border border-slate-700 border-b-0 transition whitespace-nowrap z-20">Left</button>
                  <button onClick={() => handleOutpaint('right')} className="absolute top-1/2 -right-8 -translate-y-1/2 rotate-90 text-[10px] bg-slate-800 hover:bg-brand-600 px-3 py-1 rounded-t text-gray-300 hover:text-white border border-slate-700 border-b-0 transition whitespace-nowrap z-20">Right</button>
                </>
             )}

             <canvas 
               ref={canvasRef}
               className="max-w-full max-h-[60vh] sm:max-h-[75vh] object-contain block bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTAw9HKhAAAAFElEQVQ4T2NTgIP/OP7B8VAx4CwAJMQ/wT78r2gAAAAASUVORK5CYII=')] touch-none"
               onPointerDown={handlePointerDown}
               onPointerMove={handlePointerMove}
               onPointerUp={handlePointerUp}
               onPointerCancel={handlePointerUp}
             />
          </div>

          {/* Enhanced Cursor (Hidden on touch devices typically, but good for feedback) */}
          {isHovering && (
             <div 
               className="pointer-events-none absolute rounded-full border z-50 transition-colors duration-100 hidden sm:block"
               style={{
                  width: brushSize,
                  height: brushSize,
                  left: cursorPos.x - brushSize/2,
                  top: cursorPos.y - brushSize/2,
                  borderColor: activeTool === 'eraser' ? 'rgba(239, 68, 68, 0.8)' : activeTool === 'superzoom' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  backgroundColor: activeTool === 'eraser' ? 'rgba(239, 68, 68, 0.1)' : activeTool === 'superzoom' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: brushHardness < 80 ? `0 0 ${brushSize/4}px ${activeTool === 'eraser' ? 'red' : 'white'}` : 'none'
               }}
             />
          )}

          {activeTool === 'superzoom' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg pointer-events-none z-50 animate-bounce text-center whitespace-nowrap">
                  Chế độ Zoom
              </div>
          )}
       </div>
       
       {/* Bottom Actions */}
       <div className="border-t border-slate-700 bg-slate-800 p-4 flex flex-col sm:flex-row justify-end gap-3 shrink-0 pb-6 sm:pb-4">
           <button onClick={onCancel} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:bg-slate-700 border border-slate-600 transition">Hủy bỏ</button>
           <button 
             onClick={handleExport}
             className="w-full sm:w-auto px-8 py-3 sm:py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition transform active:scale-95"
           >
             {isUpscaleMode ? 'Xác nhận Upscale' : activeTool === 'superzoom' ? 'Tạo Super Zoom' : 'Áp dụng & Tạo ảnh'}
           </button>
       </div>
    </div>
  );
};
