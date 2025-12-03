
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ApiKeyChecker } from './components/ApiKeyChecker';
import { ImageUploader } from './components/ImageUploader';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ImageCropperModal } from './components/ImageCropperModal';
import { MaskEditor } from './components/MaskEditor';
import { PromptAssistant } from './components/PromptAssistant'; // Import
import { generateImageContent, generateVideoContent } from './services/geminiService';
import { GenerationConfig, GenerationStyle, GenerationMode, GenerationModel, VideoType, UploadedImage, AspectRatio, Resolution, GenerationTask, CameraAngle, VideoDuration, EditType } from './types';
import { CAMERA_ANGLES, STYLES_LIST, MODEL_OPTIONS, MODEL_LABELS, RESOLUTIONS } from './constants';

const FEATURED_STYLES = [
  'AUTO',
  'TSHIRT_DESIGN',
  'IPHONE_RAW',
  'IPHONE_PHOTO',
  'REALISTIC',
  'CINEMATIC',
  '3D_RENDER',
  'MINIMALIST'
];

const VND_PER_TOKEN = 0.15; // Estimated safe average

// --- RESIZE CONSTANTS ---
const MIN_LEFT_WIDTH = 260;
const MAX_LEFT_WIDTH = 450;
const MIN_RIGHT_WIDTH = 300;
const MAX_RIGHT_WIDTH = 500;

// --- SVG ICONS MAPPING ---
// Using SVGs instead of emojis for a cleaner look
const ModeIcons = {
  [GenerationMode.CREATIVE]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  [GenerationMode.COPY_IDEA]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548 5.478a1 1 0 01-.994.904H8.42a1 1 0 01-.994-.904l-.548-5.478z" /></svg>,
  [GenerationMode.VIDEO]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  [GenerationMode.EDIT]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
};

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default Dark Mode for better Glass effect
  const [currentTime, setCurrentTime] = useState(Date.now()); // For Timer
  const [showMobileMenu, setShowMobileMenu] = useState(false); // Mobile Drawer State
  const [showMobileAssistant, setShowMobileAssistant] = useState(false); // Mobile Assistant Toggle
  
  // -- LAYOUT RESIZING STATE --
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(350);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // -- TOKEN USAGE --
  const [totalTokens, setTotalTokens] = useState(0);

  // -- MODE STATE --
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.CREATIVE);
  const [showFavorites, setShowFavorites] = useState(false); // New Favorites View State

  // -- COMMON INPUTS --
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('2K'); 
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('NONE');
  const [selectedModel, setSelectedModel] = useState<GenerationModel>(GenerationModel.GEMINI_PRO);

  // -- CREATIVE MODE INPUTS --
  const [selectedStyle, setSelectedStyle] = useState<GenerationStyle>(GenerationStyle.AUTO); // Default AUTO
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const [tshirtColor, setTshirtColor] = useState(''); 
  
  // -- COPY CONCEPT MODE INPUTS --
  const [conceptImages, setConceptImages] = useState<UploadedImage[]>([]);
  const [subjectImage, setSubjectImage] = useState<UploadedImage | null>(null);
  const [conceptStrength, setConceptStrength] = useState<number>(75);
  const [subjectStrength, setSubjectStrength] = useState<number>(80);
  const [conceptPrompt, setConceptPrompt] = useState('');

  // -- VIDEO MODE INPUTS --
  const [videoType, setVideoType] = useState<VideoType>(VideoType.TEXT_TO_VIDEO);
  const [videoStartFrame, setVideoStartFrame] = useState<UploadedImage | null>(null);
  const [videoEndFrame, setVideoEndFrame] = useState<UploadedImage | null>(null);
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('5s');
  const [keepOutfit, setKeepOutfit] = useState(false);
  const [keepBackground, setKeepBackground] = useState(false);

  // -- EDIT MODE INPUTS --
  const [editImage, setEditImage] = useState<UploadedImage | null>(null);
  const [isEditingMask, setIsEditingMask] = useState(false);
  const [editType, setEditType] = useState<EditType>(EditType.INPAINT);
  const [maskImage, setMaskImage] = useState<UploadedImage | null>(null);

  // -- PRESERVATION FLAGS --
  const [keepFace, setKeepFace] = useState(false);
  const [preservePose, setPreservePose] = useState(false);
  const [preserveExpression, setPreserveExpression] = useState(false);
  const [preserveStructure, setPreserveStructure] = useState(false);

  // -- TASK QUEUE --
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [previewTask, setPreviewTask] = useState<GenerationTask | null>(null);

  // -- API KEY STATE --
  const [apiKeyInput, setApiKeyInput] = useState('');

  // -- CROPPER STATE --
  const [cropState, setCropState] = useState<{
    image: UploadedImage;
    callback: (img: UploadedImage) => void;
    aspectRatio: number;
  } | null>(null);

  // -- COMPUTED --
  // Filter Models based on Mode
  const filteredModels = useMemo(() => {
    if (mode === GenerationMode.VIDEO) {
      return MODEL_OPTIONS.filter(m => m.id === GenerationModel.VEO_FAST);
    } else {
      return MODEL_OPTIONS.filter(m => m.id !== GenerationModel.VEO_FAST);
    }
  }, [mode]);

  // Determine if Resolution Selector should be shown
  const showResolutionSelector = useMemo(() => {
    return selectedModel === GenerationModel.GEMINI_PRO || selectedModel === GenerationModel.IMAGEN_ULTRA;
  }, [selectedModel]);

  const filteredTasks = useMemo(() => {
    return showFavorites 
        ? tasks.filter(t => t.isFavorite) 
        : tasks;
  }, [tasks, showFavorites]);

  // -- EFFECTS --

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft.current) {
        const newWidth = Math.min(Math.max(e.clientX, MIN_LEFT_WIDTH), MAX_LEFT_WIDTH);
        setLeftSidebarWidth(newWidth);
      }
      if (isResizingRight.current) {
        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_RIGHT_WIDTH), MAX_RIGHT_WIDTH);
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto'; // Re-enable selection
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load API Key on Mount
  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setApiKeyInput(stored);
  }, []);

  // Update Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100); 
    return () => clearInterval(interval);
  }, []);

  // Update Selected Model when filtering changes
  useEffect(() => {
    if (!filteredModels.find(m => m.id === selectedModel)) {
      if (filteredModels.length > 0) {
        setSelectedModel(filteredModels[0].id);
      }
    }
  }, [filteredModels, selectedModel]);

  // Update API Key
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Sanitize input: remove any non-ASCII characters to prevent headers error
    const sanitizedVal = val.replace(/[^\x00-\x7F]/g, "").trim();
    setApiKeyInput(sanitizedVal);
    localStorage.setItem('gemini_api_key', sanitizedVal);
  };

  // Global Paste Handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // If paste occurs inside a specific container that handles its own paste (like PromptAssistant), we skip
      if (e.target instanceof HTMLElement && e.target.closest('.prompt-assistant-container')) {
         return;
      }
      // If favorites is active, ignore paste
      if (showFavorites) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      const uploadedImage = await new Promise<UploadedImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.includes('base64,') ? base64String.split('base64,')[1] : base64String;
          resolve({
            id: Date.now().toString(),
            base64: base64Data,
            mimeType: file.type
          });
        };
        reader.readAsDataURL(file);
      });

      if (mode === GenerationMode.CREATIVE) {
        setReferenceImages(prev => [...prev, uploadedImage]);
      } else if (mode === GenerationMode.COPY_IDEA) {
        if (conceptImages.length < 3) {
           setConceptImages(prev => [...prev, uploadedImage]);
        } else if (!subjectImage) {
           setSubjectImage(uploadedImage);
        }
      } else if (mode === GenerationMode.VIDEO) {
        if (videoType === VideoType.FRAMES) {
          if (!videoStartFrame) {
            triggerCrop(uploadedImage, (cropped) => setVideoStartFrame(cropped));
          } else if (!videoEndFrame) {
            triggerCrop(uploadedImage, (cropped) => setVideoEndFrame(cropped));
          }
        } else if (videoType === VideoType.IMAGE_TO_VIDEO) {
          triggerCrop(uploadedImage, (cropped) => setVideoStartFrame(cropped));
        }
      } else if (mode === GenerationMode.EDIT) {
          if (!editImage) setEditImage(uploadedImage);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode, videoType, conceptImages, subjectImage, videoStartFrame, videoEndFrame, aspectRatio, editImage, showFavorites]); 

  // -- HANDLERS --
  
  const startResizingLeft = useCallback(() => {
    isResizingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Disable text selection while dragging
  }, []);

  const startResizingRight = useCallback(() => {
    isResizingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const triggerCrop = (img: UploadedImage, cb: (img: UploadedImage) => void, forcedRatio?: number) => {
    const ratio = forcedRatio !== undefined ? forcedRatio : (aspectRatio === '9:16' ? 9/16 : aspectRatio === '16:9' ? 16/9 : 0);
    setCropState({
      image: img,
      aspectRatio: ratio,
      callback: cb
    });
  };

  const handleAddRefImages = (newImages: UploadedImage[]) => setReferenceImages(prev => [...prev, ...newImages]);
  const handleRemoveRefImage = (id: string) => setReferenceImages(prev => prev.filter(img => img.id !== id));
  const handleClearRefImages = () => setReferenceImages([]);

  const handleAddConceptImages = (imgs: UploadedImage[]) => setConceptImages(prev => [...prev, ...imgs].slice(0, 3));
  const handleRemoveConceptImage = (id: string) => setConceptImages(prev => prev.filter(img => img.id !== id));
  const handleClearConceptImages = () => setConceptImages([]);
  
  const handleSetSubject = (imgs: UploadedImage[]) => setSubjectImage(imgs[0]);
  const handleRemoveSubject = () => setSubjectImage(null);

  const handleSwapConceptSubject = () => {
    if (conceptImages.length === 0 && !subjectImage) return;
    const oldSubject = subjectImage;
    const oldFirstConcept = conceptImages[0];
    
    setSubjectImage(oldFirstConcept || null);
    
    const newConcepts = [...conceptImages];
    if (newConcepts.length > 0) {
       if (oldSubject) newConcepts[0] = oldSubject;
       else newConcepts.shift();
    } else if (oldSubject) {
       newConcepts.push(oldSubject);
    }
    setConceptImages(newConcepts);
  };

  const handleVideoCrop = (img: UploadedImage, cb: (cropped: UploadedImage) => void) => {
     triggerCrop(img, cb, aspectRatio === '9:16' ? 9/16 : 16/9);
  };

  const handleSetStartFrame = (imgs: UploadedImage[]) => setVideoStartFrame(imgs[0]);
  const handleRemoveStartFrame = () => setVideoStartFrame(null);
  const handleSetEndFrame = (imgs: UploadedImage[]) => setVideoEndFrame(imgs[0]);
  const handleRemoveEndFrame = () => setVideoEndFrame(null);

  const handleSetEditImage = (imgs: UploadedImage[]) => setEditImage(imgs[0]);
  const handleRemoveEditImage = () => { setEditImage(null); setMaskImage(null); };
  const handleOpenMaskEditor = () => { if(editImage) setIsEditingMask(true); };
  const handleMaskSave = (edited: UploadedImage, mask: UploadedImage, isOutpaint?: boolean, isSuperZoom?: boolean) => {
     setEditImage(edited);
     setMaskImage(mask);
     setIsEditingMask(false);
     if (isOutpaint) setEditType(EditType.OUTPAINT);
     else if (isSuperZoom) setEditType(EditType.SUPER_ZOOM);
  };

  const handleMaskCancel = () => setIsEditingMask(false);

  const handleGenerate = async () => {
    // Validate inputs
    if (mode === GenerationMode.CREATIVE) {
        if (!prompt.trim() && referenceImages.length === 0) {
            alert("Vui lòng nhập mô tả hoặc tải ảnh tham khảo.");
            return;
        }
    }

    if (mode === GenerationMode.COPY_IDEA) {
        if (!prompt.trim() && conceptImages.length === 0) {
            alert("Vui lòng nhập mô tả hoặc thêm ảnh Concept.");
            return;
        }
    }

    if (mode === GenerationMode.VIDEO) {
      if (videoType === VideoType.IMAGE_TO_VIDEO && !videoStartFrame) {
        alert("Vui lòng tải lên ảnh bắt đầu.");
        return;
      }
      if (videoType === VideoType.FRAMES && (!videoStartFrame || !videoEndFrame)) {
        alert("Vui lòng tải lên cả ảnh bắt đầu và ảnh kết thúc.");
        return;
      }
      if (videoType === VideoType.TEXT_TO_VIDEO && !prompt.trim()) {
        alert("Vui lòng nhập mô tả video.");
        return;
      }
    }

    if (mode === GenerationMode.EDIT) {
        if (!editImage) {
            alert("Vui lòng tải lên ảnh cần chỉnh sửa.");
            return;
        }
    }

    const taskId = Date.now().toString();
    const newTask: GenerationTask = {
      id: taskId,
      config: {
        mode,
        model: selectedModel,
        prompt,
        style: selectedStyle,
        referenceImages,
        conceptImages,
        subjectImage: subjectImage || undefined,
        conceptStrength,
        subjectStrength,
        conceptPrompt,
        videoType,
        startFrame: videoStartFrame || undefined,
        endFrame: videoEndFrame || undefined,
        videoDuration,
        videoResolution: '720p',
        editType,
        editImage: editImage || undefined,
        maskImage: maskImage || undefined,
        aspectRatio,
        resolution,
        cameraAngle,
        keepFace,
        preservePose,
        preserveExpression,
        preserveStructure,
        keepOutfit,
        keepBackground,
        backgroundColor: tshirtColor, 
      },
      status: 'pending',
      progress: 0,
      timestamp: Date.now(),
      isFavorite: false,
    };

    setTasks(prev => [newTask, ...prev]);

    // Progress Simulation
    const progressInterval = setInterval(() => {
        setTasks(currentTasks => {
            return currentTasks.map(t => {
                if (t.id === taskId && t.status === 'processing') {
                    let increment = 0;
                    if (t.progress < 30) increment = Math.random() * 5 + 2; 
                    else if (t.progress < 70) increment = Math.random() * 2 + 1; 
                    else if (t.progress < 90) increment = Math.random() * 0.5; 
                    else increment = 0; 

                    const nextProgress = Math.min(t.progress + increment, 95);
                    return { ...t, progress: parseFloat(nextProgress.toFixed(1)) };
                }
                return t;
            });
        });
    }, 500); 

    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'processing', progress: 5 } : t));
      
      let result;
      if (mode === GenerationMode.VIDEO) {
          result = await generateVideoContent(newTask.config);
      } else {
          result = await generateImageContent(newTask.config);
      }
      
      clearInterval(progressInterval);
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        status: 'completed', 
        progress: 100, 
        resultUrl: result.url,
        usage: result.usage,
        elapsedSeconds: (Date.now() - t.timestamp) / 1000
      } : t));

      if (result.usage?.totalTokenCount) {
        setTotalTokens(prev => prev + result.usage!.totalTokenCount);
      }

    } catch (error: any) {
      clearInterval(progressInterval);
      console.error(error);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: error.message || "Lỗi không xác định" } : t));
    }
  };

  const handleToggleFavorite = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleReuseTask = (task: GenerationTask) => {
    const config = task.config;
    
    // 1. Switch View
    setShowFavorites(false);
    
    // 2. Set Mode
    setMode(config.mode);

    // 3. Set Common Configs
    setPrompt(config.prompt);
    setSelectedModel(config.model);
    setSelectedStyle(config.style);
    setAspectRatio(config.aspectRatio);
    setResolution(config.resolution);
    setCameraAngle(config.cameraAngle || 'NONE');

    // 4. Set Images - CRITICAL: Handle undefined/empty arrays carefully to reset state
    // Creative Mode
    setReferenceImages(config.referenceImages && config.referenceImages.length > 0 ? [...config.referenceImages] : []);
    setTshirtColor(config.backgroundColor || '');

    // Copy Idea Mode
    setConceptImages(config.conceptImages && config.conceptImages.length > 0 ? [...config.conceptImages] : []);
    setSubjectImage(config.subjectImage || null);
    setConceptStrength(config.conceptStrength ?? 75);
    setSubjectStrength(config.subjectStrength ?? 80);
    setConceptPrompt(config.conceptPrompt || '');

    // Video Mode
    setVideoType(config.videoType || VideoType.TEXT_TO_VIDEO);
    setVideoStartFrame(config.startFrame || null);
    setVideoEndFrame(config.endFrame || null);
    setVideoDuration(config.videoDuration || '5s');
    setKeepOutfit(config.keepOutfit || false);
    setKeepBackground(config.keepBackground || false);

    // Edit Mode
    setEditType(config.editType || EditType.INPAINT);
    setEditImage(config.editImage || null);
    setMaskImage(config.maskImage || null);
    setIsEditingMask(false); 

    // 5. Preservation Flags
    setKeepFace(config.keepFace || false);
    setPreservePose(config.preservePose || false);
    setPreserveExpression(config.preserveExpression || false);
    setPreserveStructure(config.preserveStructure || false);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getElapsedTime = (startTime: number) => {
    const diff = currentTime - startTime;
    return (diff / 1000).toFixed(1) + 's';
  };

  // --- RENDER SIDEBAR CONTENT (SHARED) ---
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full space-y-6">
      {/* API Key Setting */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">API Key</label>
        <input 
          type="password"
          value={apiKeyInput}
          onChange={handleApiKeyChange}
          placeholder="Paste Google API Key..."
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
        />
      </div>

      {/* Model Selection (Filtered) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Model</label>
        <div className="grid gap-2">
          {filteredModels.map(opt => (
            <button
               key={opt.id}
               onClick={() => { setSelectedModel(opt.id); setShowMobileMenu(false); }}
               className={`relative flex items-center justify-between rounded-xl border p-3 text-left transition-all ${selectedModel === opt.id ? 'border-brand-500 bg-brand-500/10 shadow-neon' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`}
            >
              <div>
                <div className={`font-semibold text-sm ${selectedModel === opt.id ? 'text-brand-300' : 'text-slate-300'}`}>{opt.label}</div>
                <div className="text-[10px] text-slate-500">{opt.desc}</div>
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${selectedModel === opt.id ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{opt.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Selector */}
      {mode === GenerationMode.CREATIVE && !showFavorites && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Art Style</label>
            <button onClick={() => setShowAllStyles(!showAllStyles)} className="text-[10px] text-brand-400 hover:text-brand-300 underline">
               {showAllStyles ? 'Thu gọn' : 'Xem tất cả'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {STYLES_LIST.filter(s => showAllStyles || FEATURED_STYLES.includes(s.id)).map((style) => (
              <button
                key={style.id}
                onClick={() => { setSelectedStyle(style.id as GenerationStyle); setShowMobileMenu(false); }}
                className={`relative overflow-hidden rounded-xl border transition-all h-16 group ${selectedStyle === style.id ? 'border-brand-500 ring-1 ring-brand-500 scale-[1.02]' : 'border-slate-700 hover:border-slate-500'}`}
              >
                <div className={`absolute inset-0 ${style.gradient || 'bg-slate-800'} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                <div className="relative z-10 flex flex-col items-center justify-center h-full p-1">
                    <span className="text-lg drop-shadow-md filter">{style.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide drop-shadow-md ${style.gradient?.includes('text-black') || style.gradient?.includes('text-slate-800') ? 'text-slate-900' : 'text-white'}`}>
                        {style.label.split('(')[0]}
                    </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Selector (Conditional) */}
      {showResolutionSelector && !showFavorites && (
        <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolution</label>
           <div className="grid grid-cols-3 gap-2">
             {RESOLUTIONS.map((res) => (
               <button
                 key={res.value}
                 onClick={() => setResolution(res.value as Resolution)}
                 className={`rounded-lg border py-2 text-xs font-bold transition ${resolution === res.value ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
               >
                 {res.value}
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Aspect Ratio */}
      {!showFavorites && (
        <div className="space-y-3">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aspect Ratio</label>
           <div className="grid grid-cols-3 gap-2">
             {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
               <button
                 key={ratio}
                 onClick={() => setAspectRatio(ratio as AspectRatio)}
                 className={`rounded-lg border py-2 text-xs font-bold transition ${aspectRatio === ratio ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
               >
                 {ratio}
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Camera Angle */}
      {!showFavorites && (
        <div className="space-y-3">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Camera Angle</label>
           <select 
             value={cameraAngle}
             onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
             className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500"
           >
             {CAMERA_ANGLES.map(opt => (
               <option key={opt.value} value={opt.value}>{opt.label}</option>
             ))}
           </select>
        </div>
      )}
      
      <div className="pt-4 mt-auto border-t border-slate-800 pb-20 md:pb-0">
         <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Tokens Used:</span>
            <span className="font-mono text-brand-400">{totalTokens.toLocaleString()}</span>
         </div>
         <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Est. Cost:</span>
            <span className="font-mono text-green-400">≈ {(totalTokens * VND_PER_TOKEN).toLocaleString('vi-VN')}₫</span>
         </div>
      </div>
    </div>
  );

  if (!isReady) {
    return <ApiKeyChecker onReady={() => setIsReady(true)} />;
  }

  return (
    <div className={`flex min-h-screen w-full transition-colors duration-500 ${isDarkMode ? 'dark bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* --- DESKTOP LEFT SIDEBAR (RESIZABLE) --- */}
      <div 
         className="hidden flex-col border-r border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl md:flex shrink-0 relative"
         style={{ width: leftSidebarWidth }}
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-400 to-brand-600 shadow-lg shadow-brand-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="truncate">
             <h1 className="text-xl font-bold tracking-tight text-white truncate">DesignGen <span className="text-brand-400">Pro</span></h1>
             <div className="text-[10px] text-slate-400 font-medium truncate">By ThanhNguyen v2.0</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
           {renderSidebarContent()}
        </div>

        {/* DRAG HANDLE (RIGHT EDGE) */}
        <div 
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-brand-500/50 transition-colors z-50 group"
          onMouseDown={startResizingLeft}
        >
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="w-1 h-4 bg-white/20 rounded-full"></div>
            </div>
        </div>
      </div>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-50 flex transform transition-transform duration-300 md:hidden ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
         {/* Overlay */}
         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}></div>
         
         {/* Drawer */}
         <div className="relative flex w-80 max-w-[85vw] flex-col bg-slate-900 p-6 shadow-2xl overflow-y-auto">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-400 to-brand-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                   </div>
                   <div className="font-bold text-white">DesignGen Pro</div>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
             </div>
             {renderSidebarContent()}
         </div>
      </div>

      {/* --- MOBILE ASSISTANT DRAWER (Right) --- */}
      <div className={`fixed inset-0 z-50 flex justify-end transform transition-transform duration-300 md:hidden ${showMobileAssistant ? 'translate-x-0' : 'translate-x-full'}`}>
         {/* Overlay */}
         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileAssistant(false)}></div>
         {/* Drawer */}
         <div className="relative flex w-full max-w-[85vw] flex-col bg-slate-900 shadow-2xl overflow-hidden h-full">
             <PromptAssistant 
                onApplyPrompt={(newPrompt) => { setPrompt(newPrompt); setShowMobileAssistant(false); }}
                onClose={() => setShowMobileAssistant(false)}
             />
         </div>
      </div>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* CENTER CONTENT */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-aurora w-full transition-all">
            {/* Top Navigation / Mobile Header */}
            <div className="glass-panel z-10 flex flex-col gap-4 border-b border-white/10 p-4 shadow-glass backdrop-blur-md sticky top-0 md:relative">
                <div className="flex items-center justify-between">
                
                {/* Mobile Menu Button (Only Visible on Mobile) */}
                <div className="flex items-center gap-3 md:hidden">
                    <button onClick={() => setShowMobileMenu(true)} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <div className="font-bold text-white text-base">DesignGen <span className="text-brand-400">Pro</span></div>
                </div>

                {/* Mode Tabs (Responsive) */}
                <div className="flex overflow-x-auto scrollbar-hide gap-2 p-1 bg-black/20 rounded-xl backdrop-blur-sm self-center w-full sm:w-auto mt-2 sm:mt-0">
                    {[
                    { id: GenerationMode.CREATIVE, label: 'Creative' },
                    { id: GenerationMode.COPY_IDEA, label: 'Copy Idea' },
                    { id: GenerationMode.VIDEO, label: 'Video' },
                    { id: GenerationMode.EDIT, label: 'Edit' },
                    ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => { setMode(m.id as GenerationMode); setShowFavorites(false); }}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${mode === m.id && !showFavorites ? 'bg-white text-slate-900 shadow-lg scale-105' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                        {ModeIcons[m.id as GenerationMode]}
                        <span className="hidden sm:inline">{m.label}</span>
                        <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                    </button>
                    ))}
                </div>

                {/* Right Controls (Favorites, Dark Mode & Assistant Toggle) */}
                <div className="flex items-center gap-2 absolute right-4 top-4 md:relative md:right-0 md:top-0">
                    {/* Favorites Toggle */}
                    <button 
                        onClick={() => setShowFavorites(!showFavorites)} 
                        className={`rounded-full p-2 transition-all ${showFavorites ? 'bg-red-500 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title="Bộ sưu tập Yêu thích"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="rounded-full bg-white/10 p-2 text-white">
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                    {/* Assistant Toggle - Mobile Only */}
                    <button 
                        onClick={() => setShowMobileAssistant(!showMobileAssistant)}
                        className="md:hidden rounded-full p-2 transition-all bg-white/10 text-white hover:bg-white/20"
                        title="AI Prompt Assistant"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                </div>
            </div>

            {/* Scrollable Workspace */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide relative z-0">
                <div className="mx-auto max-w-6xl space-y-8 pb-20">
                
                {/* --- INPUT SECTION (HIDDEN IN FAVORITES VIEW) --- */}
                {!showFavorites && (
                    <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-2xl animate-[fadeIn_0.5s_ease-out]">
                        
                        {/* 1. CREATIVE MODE UI */}
                        {mode === GenerationMode.CREATIVE && (
                            <div className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                                {/* Reference Image Section (Large) */}
                                <div className="w-full md:w-5/12 space-y-2">
                                    <ImageUploader 
                                    images={referenceImages} 
                                    onImagesSelected={handleAddRefImages} 
                                    onRemoveImage={handleRemoveRefImage}
                                    onClearAll={handleClearRefImages}
                                    onCrop={(img, cb) => triggerCrop(img, cb)}
                                    label="Ảnh Tham Khảo (Optional)"
                                    placeholder="Thêm ảnh mẫu"
                                    />
                                </div>
                                <div className="w-full md:w-7/12 flex flex-col gap-4">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold text-slate-300 uppercase">Mô tả ý tưởng</label>
                                        <textarea 
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Mô tả chi tiết hình ảnh bạn muốn tạo..."
                                        className="h-32 sm:h-40 w-full rounded-2xl border border-white/20 bg-black/20 p-4 text-white placeholder-white/40 shadow-inner backdrop-blur-sm focus:border-brand-500 focus:bg-black/30 outline-none transition resize-none text-sm"
                                        />
                                    </div>

                                    {/* --- T-SHIRT COLOR INPUT --- */}
                                    {selectedStyle === GenerationStyle.TSHIRT_DESIGN && (
                                        <div className="animate-[fadeIn_0.3s_ease-out]">
                                            <label className="mb-2 block text-xs font-bold text-brand-300 uppercase">Màu nền mong muốn</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text"
                                                    value={tshirtColor}
                                                    onChange={(e) => setTshirtColor(e.target.value)}
                                                    placeholder="VD: Xanh đậm, Đen... (Nền ảnh kết quả)"
                                                    className="w-full rounded-xl border border-white/20 bg-black/20 p-3 text-white text-sm placeholder-white/40 shadow-inner backdrop-blur-sm focus:border-brand-500 focus:bg-black/30 outline-none transition"
                                                />
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-400">AI sẽ tạo ảnh với màu nền bạn nhập ở trên.</p>
                                        </div>
                                    )}
                                    
                                    {/* Preservation Toggles */}
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                        { label: 'Giữ Khuôn Mặt', state: keepFace, set: setKeepFace },
                                        { label: 'Giữ Dáng Pose', state: preservePose, set: setPreservePose },
                                        { label: 'Giữ Cấu Trúc', state: preserveStructure, set: setPreserveStructure },
                                        ].map((t) => (
                                        <button 
                                            key={t.label}
                                            onClick={() => t.set(!t.state)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center gap-1 ${t.state ? 'bg-brand-500 border-brand-500 text-white' : 'bg-transparent border-white/20 text-slate-300 hover:bg-white/10'}`}
                                        >
                                            <span className={t.state ? 'text-white' : 'text-transparent'}>✓</span> {t.label}
                                        </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}

                        {/* 2. COPY IDEA MODE UI - COMPACT LAYOUT UPDATED */}
                        {mode === GenerationMode.COPY_IDEA && (
                            <div className="space-y-6">
                            {/* Forced Grid-cols-2 for compact side-by-side view even on medium screens */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 relative">
                                {/* Swap Button */}
                                <button 
                                    onClick={handleSwapConceptSubject}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-slate-800 border border-slate-600 text-white shadow-xl flex items-center justify-center hover:bg-brand-600 transition"
                                    title="Đổi chỗ Concept & Subject"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </button>

                                {/* Concept Section */}
                                <div className="space-y-2 p-2 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-brand-300 uppercase truncate">1. Style (Max 3)</span>
                                        <span className="text-[10px] text-slate-400">{conceptStrength}%</span>
                                    </div>
                                    <div className="flex-1 min-h-[100px]">
                                        <ImageUploader 
                                        images={conceptImages} 
                                        maxImages={3}
                                        onImagesSelected={handleAddConceptImages}
                                        onRemoveImage={handleRemoveConceptImage}
                                        onClearAll={handleClearConceptImages}
                                        onCrop={(img, cb) => triggerCrop(img, cb)}
                                        placeholder="Tải Concept"
                                        />
                                    </div>
                                    <input 
                                    type="range" min="0" max="100" value={conceptStrength} 
                                    onChange={(e) => setConceptStrength(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                    />
                                    <textarea 
                                        value={conceptPrompt}
                                        onChange={(e) => setConceptPrompt(e.target.value)}
                                        placeholder="Ghi chú thêm..."
                                        className="w-full h-12 sm:h-16 rounded-xl bg-black/20 border-white/10 text-[10px] sm:text-xs p-2 text-white placeholder-white/30 resize-none focus:bg-black/40 outline-none"
                                    />
                                </div>

                                {/* Subject Section */}
                                <div className="space-y-2 p-2 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-blue-300 uppercase truncate">2. Subject (Chủ thể)</span>
                                        <span className="text-[10px] text-slate-400">{subjectStrength}%</span>
                                    </div>
                                    <div className="flex-1 min-h-[100px]">
                                        <ImageUploader 
                                        images={subjectImage ? [subjectImage] : []} 
                                        maxImages={1}
                                        onImagesSelected={handleSetSubject}
                                        onRemoveImage={handleRemoveSubject}
                                        onClearAll={handleRemoveSubject}
                                        onCrop={(img, cb) => triggerCrop(img, cb)}
                                        placeholder="Tải Subject"
                                        />
                                    </div>
                                    <input 
                                    type="range" min="0" max="100" value={subjectStrength} 
                                    onChange={(e) => setSubjectStrength(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <textarea 
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Mô tả chủ thể..."
                                        className="w-full h-12 sm:h-16 rounded-xl bg-black/20 border-white/10 text-[10px] sm:text-xs p-2 text-white placeholder-white/30 resize-none focus:bg-black/40 outline-none"
                                    />
                                </div>
                            </div>
                            </div>
                        )}

                        {/* 3. VIDEO MODE UI */}
                        {mode === GenerationMode.VIDEO && (
                            <div className="space-y-6">
                            {/* Video Type Tabs */}
                            <div className="flex justify-center mb-6 overflow-x-auto pb-1 scrollbar-hide">
                                <div className="flex bg-black/30 p-1 rounded-xl whitespace-nowrap">
                                    {[
                                    { id: VideoType.TEXT_TO_VIDEO, label: 'Text to Video' },
                                    { id: VideoType.IMAGE_TO_VIDEO, label: 'Image to Video' },
                                    { id: VideoType.FRAMES, label: 'Start & End Frame' },
                                    ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setVideoType(t.id as VideoType)}
                                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${videoType === t.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {t.label}
                                    </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Image Inputs */}
                                {(videoType !== VideoType.TEXT_TO_VIDEO) && (
                                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-5/12">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-bold text-slate-400">Start Frame</label>
                                        <ImageUploader 
                                            images={videoStartFrame ? [videoStartFrame] : []} 
                                            maxImages={1}
                                            onImagesSelected={handleSetStartFrame}
                                            onRemoveImage={handleRemoveStartFrame}
                                            onClearAll={handleRemoveStartFrame}
                                            onCrop={handleVideoCrop}
                                            placeholder="Frame Bắt đầu"
                                        />
                                    </div>
                                    {videoType === VideoType.FRAMES && (
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold text-slate-400">End Frame</label>
                                            <ImageUploader 
                                            images={videoEndFrame ? [videoEndFrame] : []} 
                                            maxImages={1}
                                            onImagesSelected={handleSetEndFrame}
                                            onRemoveImage={handleRemoveEndFrame}
                                            onClearAll={handleRemoveEndFrame}
                                            onCrop={handleVideoCrop}
                                            placeholder="Frame Kết thúc"
                                            />
                                        </div>
                                    )}
                                    </div>
                                )}

                                {/* Prompt & Settings */}
                                <div className={`w-full ${videoType === VideoType.TEXT_TO_VIDEO ? 'lg:w-full' : 'lg:w-7/12'} space-y-4`}>
                                    <textarea 
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder={videoType === VideoType.FRAMES ? "Mô tả chuyển động giữa 2 frame..." : "Mô tả video bạn muốn tạo..."}
                                        className="h-32 sm:h-40 w-full rounded-2xl border border-white/20 bg-black/20 p-4 text-white placeholder-white/40 shadow-inner resize-none focus:bg-black/30 outline-none text-sm"
                                    />
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400 block mb-1">Duration</label>
                                        <select 
                                            value={videoDuration} 
                                            onChange={(e) => setVideoDuration(e.target.value as VideoDuration)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                                        >
                                            <option value="5s">5 Seconds</option>
                                            <option value="10s">10 Seconds (Beta)</option>
                                        </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                        <input type="checkbox" checked={keepOutfit} onChange={(e) => setKeepOutfit(e.target.checked)} className="accent-brand-500 rounded" />
                                        Giữ Trang Phục
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                        <input type="checkbox" checked={keepBackground} onChange={(e) => setKeepBackground(e.target.checked)} className="accent-brand-500 rounded" />
                                        Giữ Background
                                        </label>
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}
                        
                        {/* 4. EDIT MODE UI */}
                        {mode === GenerationMode.EDIT && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="w-full md:w-5/12 flex flex-col gap-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Ảnh Gốc</label>
                                        <ImageUploader 
                                            images={editImage ? [editImage] : []}
                                            maxImages={1}
                                            onImagesSelected={handleSetEditImage}
                                            onRemoveImage={handleRemoveEditImage}
                                            onClearAll={handleRemoveEditImage}
                                            onCrop={(img, cb) => triggerCrop(img, cb)}
                                            placeholder="Tải ảnh lên"
                                        />
                                        {editImage && (
                                            <button 
                                                onClick={handleOpenMaskEditor}
                                                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg transition flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                Vẽ Mask / Chỉnh sửa
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="w-full md:w-7/12 space-y-4">
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {[
                                                { id: EditType.INPAINT, label: 'Inpaint (Sửa vùng)' },
                                                { id: EditType.OUTPAINT, label: 'Outpaint (Mở rộng)' },
                                                { id: EditType.UPSCALE, label: 'Upscale (Nét hoá)' },
                                                { id: EditType.SUPER_ZOOM, label: 'Super Zoom' },
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setEditType(t.id as EditType)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition border ${editType === t.id ? 'bg-brand-500 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>

                                        <textarea 
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder={editType === EditType.UPSCALE ? "Mô tả chi tiết để tăng độ nét (Optional)..." : "Mô tả những gì bạn muốn thay đổi trong vùng Mask..."}
                                            className="h-32 sm:h-40 w-full rounded-2xl border border-white/20 bg-black/20 p-4 text-white placeholder-white/40 shadow-inner resize-none focus:bg-black/30 outline-none text-sm"
                                        />
                                        
                                        {maskImage && (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-xs font-bold text-green-400">Đã có Mask sẵn sàng</span>
                                                <button onClick={() => setMaskImage(null)} className="ml-auto text-xs text-slate-400 underline hover:text-white">Xóa Mask</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACTION BUTTON */}
                        <div className="mt-6 sm:mt-8">
                            <button 
                            onClick={handleGenerate}
                            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 py-3 sm:py-4 font-bold text-white shadow-neon transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
                            >
                            <div className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100"></div>
                            <div className="relative flex items-center justify-center gap-2 text-lg">
                                {mode === GenerationMode.VIDEO ? (
                                <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Generate Video</>
                                ) : mode === GenerationMode.EDIT ? (
                                <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> Execute Edit</>
                                ) : (
                                <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Generate Design</>
                                )}
                            </div>
                            </button>
                        </div>

                    </div>
                )}
                
                {/* Favorites Header Title */}
                {showFavorites && (
                     <div className="flex items-center gap-3 mb-6 animate-[fadeIn_0.5s_ease-out]">
                         <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span className="text-red-500">❤️</span> Bộ Sưu Tập Yêu Thích
                         </h2>
                         <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-slate-300 font-mono">
                             {filteredTasks.length} items
                         </span>
                     </div>
                )}

                {/* --- RESULTS SECTION (Optimized Grid) --- */}
                {filteredTasks.length === 0 && showFavorites ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <p className="text-lg font-medium">Chưa có ảnh yêu thích</p>
                        <p className="text-sm">Hãy thả tim các tác phẩm bạn ưng ý nhé!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {filteredTasks.map((task) => (
                        <div key={task.id} className="glass-panel group relative overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                            
                            {/* LOADING STATE: SOPHISTICATED LIGHT SWEEP ANIMATION */}
                            {task.status === 'processing' && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md">
                                    
                                    {/* Top Info */}
                                    <div className="mb-6 text-center px-8 w-full">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse"></div>
                                        <div className="text-[10px] font-bold text-brand-400 tracking-[0.2em] uppercase">Processing Task</div>
                                        </div>
                                        <div className="text-white text-sm font-light opacity-80 line-clamp-2 leading-relaxed">
                                        "{task.config.prompt}"
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-500 uppercase tracking-wide">{task.config.style}</div>
                                    </div>

                                    {/* Percentage Big Display */}
                                    <div className="relative mb-6">
                                        <span className="text-8xl font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-lg">
                                        {task.progress}<span className="text-4xl align-top opacity-50">%</span>
                                        </span>
                                    </div>
                                    
                                    {/* Monospace Timer */}
                                    <div className="font-mono text-xs text-brand-300 bg-brand-900/20 px-3 py-1 rounded-full border border-brand-500/20">
                                        T + {getElapsedTime(task.timestamp)}
                                    </div>

                                    {/* Bottom Light Sweep Progress Bar */}
                                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-800">
                                        <div 
                                        className="h-full bg-brand-500 relative overflow-hidden transition-all duration-300 ease-out"
                                        style={{ width: `${task.progress}%` }}
                                        >
                                        {/* The Light Sweep Effect */}
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="aspect-square w-full bg-black/40 relative">
                                {task.resultUrl ? (
                                    task.config.mode === GenerationMode.VIDEO ? (
                                        <video 
                                        src={task.resultUrl} 
                                        className="h-full w-full object-cover" 
                                        autoPlay muted loop playsInline
                                        onClick={() => setPreviewTask(task)}
                                        />
                                    ) : (
                                        <img 
                                        src={task.resultUrl} 
                                        className="h-full w-full object-cover cursor-pointer transition duration-700 group-hover:scale-110" 
                                        alt="Result"
                                        onClick={() => setPreviewTask(task)}
                                        />
                                    )
                                ) : (
                                    task.status === 'failed' && (
                                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-red-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-sm font-bold">Generation Failed</p>
                                        <p className="text-xs mt-1 opacity-80">{task.error}</p>
                                    </div>
                                    )
                                )}
                                
                                {/* Overlay Info */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                    <div className="flex justify-between items-end">
                                        <div>
                                        <div className="text-xs font-bold text-brand-300 mb-1 uppercase tracking-wider">{task.config.mode} • {task.config.style}</div>
                                        <p className="line-clamp-2 text-sm opacity-90">{task.config.prompt}</p>
                                        </div>
                                        {task.elapsedSeconds && (
                                        <div className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded">
                                            {task.elapsedSeconds.toFixed(1)}s
                                        </div>
                                        )}
                                    </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button 
                                        onClick={() => handleReuseTask(task)} 
                                        className="p-2 rounded-full bg-black/40 text-white hover:bg-brand-500 backdrop-blur-md" 
                                        title="Dùng lại Prompt & Setting"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleToggleFavorite(task.id)} className={`p-2 rounded-full backdrop-blur-md ${task.isFavorite ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-red-500'}`} title="Yêu thích">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                    </button>
                                    <a href={task.resultUrl} download className="p-2 rounded-full bg-black/40 text-white hover:bg-brand-500 backdrop-blur-md" title="Tải xuống">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </a>
                                    <button onClick={() => handleDeleteTask(task.id)} className="p-2 rounded-full bg-black/40 text-white hover:bg-red-600 backdrop-blur-md" title="Xóa">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                )}

                </div>
            </div>
        </div>

        {/* RIGHT SIDEBAR - PROMPT ASSISTANT (RESIZABLE & FIXED ON DESKTOP) */}
        <div
            className="hidden md:flex h-full min-h-0 flex-col border-l border-white/10 bg-slate-900/50 backdrop-blur-xl shrink-0 relative overflow-hidden"
            style={{ width: rightSidebarWidth, minWidth: MIN_RIGHT_WIDTH, flexShrink: 0 }}
        >
            {/* DRAG HANDLE (LEFT EDGE) */}
            <div 
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-brand-500/50 transition-colors z-50 group"
                onMouseDown={startResizingRight}
            >
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-4 bg-white/20 rounded-full"></div>
                </div>
            </div>

            <PromptAssistant 
                onApplyPrompt={(newPrompt) => setPrompt(newPrompt)}
                onClose={() => {}} // No close on desktop for fixed layout
            />
        </div>

      </div>
      
      {/* MODALS */}
      {previewTask && <ImagePreviewModal task={previewTask} onClose={() => setPreviewTask(null)} />}
      
      {cropState && (
         <ImageCropperModal 
            image={cropState.image} 
            aspectRatio={cropState.aspectRatio}
            onConfirm={(cropped) => {
               cropState.callback(cropped);
               setCropState(null);
            }} 
            onCancel={() => setCropState(null)} 
         />
      )}

      {isEditingMask && editImage && (
         <MaskEditor 
            image={editImage}
            onSave={handleMaskSave}
            onCancel={handleMaskCancel}
            isUpscaleMode={editType === EditType.UPSCALE}
         />
      )}

    </div>
  );
};

export default App;
