

import React, { useState, useRef, useEffect } from 'react';
import { GenerationTask, GenerationStyle, GenerationMode } from '../types';

interface ImagePreviewModalProps {
  task: GenerationTask | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ task, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Comparison State
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isComparing, setIsComparing] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      // Reset state when opening a new task
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setSliderPosition(50);
      // Auto-enable comparison if it's T-Shirt design and has reference images
      if (task.config.style === GenerationStyle.TSHIRT_DESIGN && task.config.referenceImages.length > 0) {
        setIsComparing(true);
      } else {
        setIsComparing(false);
      }
    }
  }, [task]);

  if (!task || !task.resultUrl) return null;

  const hasReference = task.config.referenceImages.length > 0;
  const referenceImage = hasReference ? `data:${task.config.referenceImages[0].mimeType};base64,${task.config.referenceImages[0].base64}` : null;
  const isVideo = task.config.mode === GenerationMode.VIDEO;

  // Zoom / Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.5, scale + delta), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isComparing || isVideo) return; // Disable drag in comparison mode or video
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Slider Handlers
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md border border-white/20" onClick={(e) => e.stopPropagation()}>
        {!isVideo && (
          <>
            <button onClick={() => { setScale(scale + 0.5) }} className="p-2 hover:text-brand-400 transition" title="Zoom In">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={() => { setScale(Math.max(0.5, scale - 0.5)) }} className="p-2 hover:text-brand-400 transition" title="Zoom Out">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="p-2 hover:text-brand-400 transition" title="Reset Fit">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" /></svg>
            </button>
          </>
        )}

        {/* Download Button */}
        <div className="mx-2 w-px bg-white/20"></div>
        <a 
          href={task.resultUrl} 
          download={`design-gen-${task.id}.${isVideo ? 'mp4' : 'png'}`}
          className="p-2 hover:text-brand-400 transition" 
          title="Tải về"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
        
        {/* Toggle Compare Mode */}
        {task.config.style === GenerationStyle.TSHIRT_DESIGN && hasReference && !isVideo && (
          <>
            <div className="mx-2 w-px bg-white/20"></div>
            <button 
              onClick={() => setIsComparing(!isComparing)} 
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${isComparing ? 'bg-brand-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isComparing ? 'Đang so sánh' : 'So sánh'}
            </button>
          </>
        )}
      </div>

      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 hover:text-red-400 backdrop-blur-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main Content Area */}
      <div 
        className="relative h-full w-full overflow-hidden flex items-center justify-center cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={contentRef}
      >
        <div 
          className="relative transition-transform duration-75 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          
          {isComparing && referenceImage ? (
            /* Comparison View */
            <div className="relative select-none shadow-2xl rounded-lg overflow-hidden group border border-white/10">
              {/* After Image (Background) - The Clean Result */}
              <img 
                src={task.resultUrl} 
                className="block max-h-[85vh] max-w-[90vw] object-contain bg-white" 
                draggable={false} 
                alt="After"
              />
              
              {/* Before Image (Foreground) - The Rough Original */}
              <div 
                className="absolute inset-0 border-r-2 border-brand-500 bg-white"
                style={{ 
                  width: `${sliderPosition}%`,
                  backgroundImage: `url(${referenceImage})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                  Before (Gốc)
                </div>
              </div>

              <div className="absolute bottom-2 right-2 rounded bg-brand-600/80 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                After (Đã sửa)
              </div>

              {/* Slider Handle Visual */}
              <div 
                className="absolute inset-y-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize group-hover:opacity-100"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center ring-2 ring-brand-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Invisible Range Input for Interaction */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={handleSliderChange}
                className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
              />
            </div>
          ) : (
            /* Standard View (Video or Image) */
            <div className="shadow-2xl rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {isVideo ? (
                <video 
                  src={task.resultUrl} 
                  controls 
                  autoPlay 
                  loop
                  className="block max-h-[85vh] max-w-[90vw]"
                />
              ) : (
                <img 
                  src={task.resultUrl} 
                  alt="Result" 
                  className="block max-h-[85vh] max-w-[90vw] object-contain" 
                  draggable={false} 
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};