
export enum GenerationStyle {
  AUTO = 'AUTO', // New Auto Style
  TSHIRT_DESIGN = 'TSHIRT_DESIGN',
  REALISTIC = 'REALISTIC',
  VECTOR = 'VECTOR',
  IPHONE_PHOTO = 'IPHONE_PHOTO',
  IPHONE_RAW = 'IPHONE_RAW', // New "Super Casual" style
  ANIME = 'ANIME',
  CYBERPUNK = 'CYBERPUNK',
  WATERCOLOR = 'WATERCOLOR',
  OIL_PAINTING = 'OIL_PAINTING',
  RENDER_3D = '3D_RENDER',
  // New Styles
  COMIC_BOOK = 'COMIC_BOOK',
  PIXEL_ART = 'PIXEL_ART',
  STEAMPUNK = 'STEAMPUNK',
  GLITCH_ART = 'GLITCH_ART',
  CINEMATIC = 'CINEMATIC',
  LINE_ART = 'LINE_ART',
  POP_ART = 'POP_ART',
  SURREALISM = 'SURREALISM',
  MINIMALIST = 'MINIMALIST',
  RETRO_WAVE = 'RETRO_WAVE',
}

export enum GenerationMode {
  CREATIVE = 'CREATIVE',
  COPY_IDEA = 'COPY_IDEA',
  VIDEO = 'VIDEO',
  EDIT = 'EDIT', 
}

export enum EditType {
  INPAINT = 'INPAINT', // Edit inside mask
  OUTPAINT = 'OUTPAINT', // Expand canvas
  UPSCALE = 'UPSCALE', // Enhance resolution
  SUPER_ZOOM = 'SUPER_ZOOM', // Zoom into region
}

export enum GenerationModel {
  GEMINI_PRO = 'gemini-3-pro-image-preview', // Nano Banana Pro
  GEMINI_FLASH = 'gemini-2.5-flash-image', // Nano Banana
  IMAGEN_ULTRA = 'imagen-4.0-generate-001', // Imagen 4 Ultra
  VEO_FAST = 'veo-3.1-fast-generate-preview', // Veo 3.1 Fast
}

export enum VideoType {
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  IMAGE_TO_VIDEO = 'IMAGE_TO_VIDEO', // Components
  FRAMES = 'FRAMES', // Start to End Frame
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type Resolution = '1K' | '2K' | '4K';
export type VideoResolution = '720p' | '1080p';
export type VideoDuration = '5s' | '10s';
export type CameraAngle = 'NONE' | 'EYE_LEVEL' | 'LOW_ANGLE' | 'HIGH_ANGLE' | 'TOP_DOWN' | 'DUTCH_ANGLE' | 'CLOSE_UP' | 'WIDE_SHOT';

export interface UploadedImage {
  id: string;
  base64: string;
  mimeType: string;
}

export interface TokenUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface GenerationConfig {
  mode: GenerationMode;
  model: GenerationModel;
  prompt: string;
  style: GenerationStyle;
  
  // Creative Mode Images
  referenceImages: UploadedImage[];
  
  // Copy Idea Mode Images
  conceptImages?: UploadedImage[]; // Changed from conceptImage to conceptImages array
  subjectImage?: UploadedImage;
  conceptStrength: number; // 0-100 (Style/Color)
  subjectStrength: number; // 0-100 (Shape/Pose)
  conceptPrompt?: string; // Extra description for concept

  // Video Specific
  videoType?: VideoType;
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  videoResolution?: VideoResolution;
  videoDuration?: VideoDuration;

  // Edit Mode Specific
  editType?: EditType;
  editImage?: UploadedImage;
  maskImage?: UploadedImage; // Black and white mask

  // Technical Settings
  aspectRatio: AspectRatio;
  resolution: Resolution;
  cameraAngle: CameraAngle;

  // Preservation Flags
  keepFace: boolean;
  preservePose: boolean;
  preserveExpression: boolean;
  preserveStructure: boolean;
  
  // Video Preservation
  keepOutfit?: boolean;
  keepBackground?: boolean;

  // T-Shirt Specific
  backgroundColor?: string;
}

export interface GenerationTask {
  id: string;
  config: GenerationConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  timestamp: number;
  isFavorite: boolean;
  resultUrl?: string;
  usage?: TokenUsage;
  elapsedSeconds?: number;
  error?: string;
}
