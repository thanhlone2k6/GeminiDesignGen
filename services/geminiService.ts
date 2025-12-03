

import { GoogleGenAI } from "@google/genai";
import { GenerationConfig, GenerationStyle, GenerationMode, GenerationModel, VideoType, EditType, TokenUsage, UploadedImage } from "../types";
import { TSHIRT_SYSTEM_PROMPT, IPHONE_SYSTEM_PROMPT, IPHONE_RAW_SYSTEM_PROMPT, COPY_IDEA_SYSTEM_PROMPT, DEFAULT_VIDEO_PROMPT, EDIT_INPAINT_PROMPT, EDIT_OUTPAINT_PROMPT, EDIT_UPSCALE_PROMPT, EDIT_SUPER_ZOOM_PROMPT, PROMPT_ASSISTANT_SYSTEM_PROMPT } from "../constants";

const MAX_RETRIES = 3;

// Helper to check if error is retryable
const isRetryableError = (error: any): boolean => {
  const status = error.status || error.code || (error.response && error.response.status);
  const message = (error.message || JSON.stringify(error)).toUpperCase();
  
  return (
    status === 429 || 
    status === 503 || 
    status === 500 || 
    message.includes("RESOURCE_EXHAUSTED") || 
    message.includes("OVERLOADED") ||
    message.includes("INTERNAL") ||
    message.includes("QUOTA")
  );
};

// Helper to format 403 errors
const handleApiError = (error: any) => {
    const status = error.status || error.code || (error.response && error.response.status);
    const message = (error.message || "").toUpperCase();

    if (status === 403 || message.includes("PERMISSION_DENIED")) {
        throw new Error("Lỗi quyền truy cập (403): Vui lòng đảm bảo Project trên Google Cloud đã bật Billing (Thanh toán) và API Key hợp lệ.");
    }
    if (message.includes("RESOURCE_EXHAUSTED") || status === 429) {
         throw new Error("Hệ thống đang quá tải hoặc hết hạn ngạch (Quota). Vui lòng thử lại sau.");
    }
    throw error;
};

// Helper to get API Key
const getApiKey = (): string => {
  let key = "";
  if (typeof window !== "undefined" && window.localStorage) {
    key = localStorage.getItem("gemini_api_key") || "";
  }
  if (!key) {
    key = process.env.API_KEY || "";
  }
  // Sanitize: Remove whitespace and non-ASCII characters to prevent "String contains non ISO-8859-1 code point" error in Headers
  return key.replace(/[^\x00-\x7F]/g, "").trim();
};

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    image?: UploadedImage;
}

// --- PROMPT ASSISTANT CHAT ---
export const chatWithAssistant = async (history: ChatMessage[], newMessage: string, image?: UploadedImage): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Missing API Key");

    const ai = new GoogleGenAI({ apiKey });
    
    // Construct the chat history + new message
    // We use generateContent here effectively as a single-turn or multi-turn request
    // But for simplicity with images, we construct the 'contents' array carefully.
    
    const contents = history.map(msg => {
        const parts: any[] = [];
        if (msg.image) {
            parts.push({ inlineData: { data: msg.image.base64, mimeType: msg.image.mimeType } });
        }
        if (msg.text) {
            parts.push({ text: msg.text });
        }
        return { role: msg.role, parts };
    });

    // Add the new message
    const newParts: any[] = [];
    if (image) {
        newParts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
        newParts.push({ text: "Describe this image in detail for a prompt." }); // Implicit instruction if image is dropped
    }
    if (newMessage) {
        newParts.push({ text: newMessage });
    }

    contents.push({ role: 'user', parts: newParts });

    try {
        const response = await ai.models.generateContent({
            model: GenerationModel.GEMINI_FLASH, // Use fast model for chat
            contents: contents,
            config: {
                systemInstruction: PROMPT_ASSISTANT_SYSTEM_PROMPT,
            }
        });
        
        return response.text || "Tôi không thể phản hồi yêu cầu này.";
    } catch (error) {
        console.error("Assistant Error:", error);
        throw error;
    }
};

// --- VIDEO GENERATION ---
export const generateVideoContent = async (config: GenerationConfig): Promise<{url: string, usage?: TokenUsage}> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Vui lòng nhập API Key trong phần Cài đặt hoặc chọn API Key.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const validAspectRatio = config.aspectRatio === '9:16' ? '9:16' : '16:9';
  const resolution = config.videoResolution || '720p';

  // Construct Video Prompt
  let videoPrompt = config.prompt && config.prompt.trim() !== "" ? config.prompt : "A cinematic video.";
  
  // Add Duration Instruction (Veo Fast might ignore, but Veo Pro or future updates might use it)
  if (config.videoDuration) {
     videoPrompt += ` Duration: approximately ${config.videoDuration}.`;
  }

  // Add Preservation Instructions
  const preservation: string[] = [];
  if (config.keepFace) preservation.push("Maintain facial identity.");
  if (config.keepOutfit) preservation.push("Keep the character's outfit consistent.");
  if (config.keepBackground) preservation.push("Keep the background consistent.");
  
  if (preservation.length > 0) {
    videoPrompt += ` Constraints: ${preservation.join(" ")}`;
  }

  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let operation;
      
      // 1. Prepare Payload based on Video Type
      if (config.videoType === VideoType.FRAMES && config.startFrame && config.endFrame) {
        // START TO END FRAME
        const promptToUse = config.prompt && config.prompt.trim() !== "" ? config.prompt : DEFAULT_VIDEO_PROMPT;
        const fullPrompt = preservation.length > 0 ? `${promptToUse} Constraints: ${preservation.join(" ")}` : promptToUse;

        operation = await ai.models.generateVideos({
          model: GenerationModel.VEO_FAST,
          prompt: fullPrompt,
          image: {
            imageBytes: config.startFrame.base64,
            mimeType: config.startFrame.mimeType,
          },
          config: {
            numberOfVideos: 1,
            resolution: resolution,
            lastFrame: {
              imageBytes: config.endFrame.base64,
              mimeType: config.endFrame.mimeType
            },
            aspectRatio: validAspectRatio,
          }
        });
      } else if (config.videoType === VideoType.IMAGE_TO_VIDEO && config.startFrame) {
        // IMAGE TO VIDEO
        operation = await ai.models.generateVideos({
          model: GenerationModel.VEO_FAST,
          prompt: videoPrompt,
          image: {
            imageBytes: config.startFrame.base64,
            mimeType: config.startFrame.mimeType,
          },
          config: {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: validAspectRatio,
          }
        });
      } else {
        // TEXT TO VIDEO
        operation = await ai.models.generateVideos({
          model: GenerationModel.VEO_FAST,
          prompt: videoPrompt,
          config: {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: validAspectRatio,
          }
        });
      }

      // 2. Poll for Completion
      console.log(`Video generation started (Attempt ${attempt}). Polling...`);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      // 3. Get Result URI
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation completed but no URI returned.");

      // 4. Fetch the Blob
      // Encode API Key to ensure special characters don't break the URL
      const response = await fetch(`${downloadLink}&key=${encodeURIComponent(apiKey)}`);
      
      if (!response.ok) {
          if (response.status === 403) {
             throw new Error("Lỗi tải video (403): Không có quyền truy cập vào file video. Kiểm tra Billing/API Key.");
          }
          throw new Error(`Failed to download video file. Status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Note: Veo operations currently don't always return token usage in the same format as generateContent.
      // We will check usageMetadata if available in operation result (not typically standard yet for Veo Preview).
      // If not, we return undefined usage.
      
      return { url, usage: undefined };

    } catch (error: any) {
      console.warn(`Video generation attempt ${attempt} failed:`, error);
      lastError = error;
      
      try { handleApiError(error); } catch(e) { throw e; }

      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const delay = 4000 * Math.pow(2, attempt - 1);
        console.log(`Retrying video generation in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// --- EDIT GENERATION (INPAINT/OUTPAINT/UPSCALE) ---
export const generateEditContent = async (config: GenerationConfig): Promise<{url: string, usage?: TokenUsage}> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Vui lòng nhập API Key trong phần Cài đặt hoặc chọn API Key.");
    
    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];
    
    // 1. Select Prompt based on Edit Type
    let systemPrompt = "";
    if (config.editType === EditType.OUTPAINT) systemPrompt = EDIT_OUTPAINT_PROMPT;
    else if (config.editType === EditType.UPSCALE) systemPrompt = EDIT_UPSCALE_PROMPT;
    else if (config.editType === EditType.SUPER_ZOOM) systemPrompt = EDIT_SUPER_ZOOM_PROMPT;
    else systemPrompt = EDIT_INPAINT_PROMPT; // Default to Inpaint
    
    const userPrompt = config.prompt || (config.editType === EditType.UPSCALE ? "Upscale and enhance details." : "Edit the image.");
    
    const finalPrompt = `${systemPrompt}\n\nUSER INSTRUCTIONS: ${userPrompt}`;
    
    // 2. Add Images (Original + Mask)
    if (config.editImage) {
        parts.push({
            inlineData: { data: config.editImage.base64, mimeType: config.editImage.mimeType }
        });
    }
    
    if (config.maskImage) {
        parts.push({
            inlineData: { data: config.maskImage.base64, mimeType: config.maskImage.mimeType }
        });
        parts.push({ text: "The second image provided is the MASK. White pixels = generate/edit. Black pixels = keep original." });
    }
    
    parts.push({ text: finalPrompt });

    // 3. Execute with Retry
    let lastError: any;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: GenerationModel.GEMINI_PRO, // Edit works best with Pro
                contents: [{ role: 'user', parts: parts }],
                config: {
                   // Optional configs
                }
            });

            if (response.candidates && response.candidates.length > 0) {
              const content = response.candidates[0].content;
              const usage = response.usageMetadata as TokenUsage;
              if (content && content.parts) {
                for (const part of content.parts) {
                  if (part.inlineData && part.inlineData.data) {
                    return {
                        url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                        usage: usage
                    };
                  }
                }
              }
            }
            throw new Error("Không nhận được hình ảnh chỉnh sửa.");
        } catch (error: any) {
            console.warn(`Edit generation attempt ${attempt} failed:`, error);
            lastError = error;
            
            try { handleApiError(error); } catch(e) { throw e; }

            if (isRetryableError(error) && attempt < MAX_RETRIES) {
                const delay = 2000 * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

// --- IMAGE GENERATION ---
export const generateImageContent = async (
  config: GenerationConfig
): Promise<{url: string, usage?: TokenUsage}> => {
  // If Mode is EDIT, redirect to edit handler
  if (config.mode === GenerationMode.EDIT) {
      return generateEditContent(config);
  }

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Vui lòng nhập API Key trong phần Cài đặt hoặc chọn API Key.");

  const ai = new GoogleGenAI({ apiKey });
  let finalPrompt = "";
  const parts: any[] = [];

  // =========================================================
  // 1. CONSTRUCT PROMPT (Shared Logic)
  // =========================================================

  // --- STYLE INSTRUCTIONS ---
  let stylePrompt = "";
  switch (config.style) {
    case GenerationStyle.AUTO:
      stylePrompt = `Analyze the user request and generate the image in the most suitable artistic style. Ensure high quality, aesthetics, and detail. \nUser Request: ${config.prompt}`;
      break;
    case GenerationStyle.TSHIRT_DESIGN:
      let bgInstruction = "";
      if (config.backgroundColor) {
          bgInstruction = `\nCRITICAL BACKGROUND INSTRUCTION: The final output image MUST have a solid ${config.backgroundColor} background. Do NOT use a white background. The design must be placed on top of this ${config.backgroundColor} background.`;
      } else {
          bgInstruction = "\nBackground: Pure WHITE (unless specified otherwise in prompt).";
      }
      stylePrompt = `${TSHIRT_SYSTEM_PROMPT}${bgInstruction}\n\nYÊU CẦU CỦA NGƯỜI DÙNG:\n${config.prompt}`;
      break;
    case GenerationStyle.IPHONE_PHOTO:
      stylePrompt = `${IPHONE_SYSTEM_PROMPT}\n\nUSER SCENE DESCRIPTION:\n${config.prompt}`;
      break;
    case GenerationStyle.IPHONE_RAW:
      stylePrompt = `${IPHONE_RAW_SYSTEM_PROMPT}\n\nUSER SNAPSHOT DESCRIPTION:\n${config.prompt}`;
      break;
    case GenerationStyle.REALISTIC:
      stylePrompt = `Hyper-realistic photograph, 8k resolution, highly detailed, cinematic lighting. ${config.prompt}`;
      break;
    case GenerationStyle.CINEMATIC:
      stylePrompt = `Cinematic shot, movie scene, dramatic lighting, shallow depth of field, color graded, 8k. ${config.prompt}`;
      break;
    case GenerationStyle.VECTOR:
      stylePrompt = `Flat vector art, clean lines, illustrator style, svg style, minimal gradients, white background. ${config.prompt}`;
      break;
    case GenerationStyle.ANIME:
      stylePrompt = `High quality anime art style, Japanese animation, vibrant colors, detailed character design, Studio Ghibli inspired. ${config.prompt}`;
      break;
    case GenerationStyle.CYBERPUNK:
      stylePrompt = `Cyberpunk style, neon lights, night city, futuristic high-tech, dark atmosphere, glowing accents. ${config.prompt}`;
      break;
    case GenerationStyle.RENDER_3D:
      stylePrompt = `3D render, Octane render, Unreal Engine 5, ray tracing, highly detailed materials, studio lighting. ${config.prompt}`;
      break;
    case GenerationStyle.COMIC_BOOK:
      stylePrompt = `Comic book style, bold outlines, halftone patterns, vibrant colors, dynamic action, graphic novel aesthetic. ${config.prompt}`;
      break;
    case GenerationStyle.PIXEL_ART:
      stylePrompt = `Pixel art, 8-bit style, retro gaming aesthetic, blocky details, limited color palette. ${config.prompt}`;
      break;
    case GenerationStyle.STEAMPUNK:
      stylePrompt = `Steampunk aesthetic, victorian sci-fi, brass and copper gears, steam powered machinery, vintage sepia tones. ${config.prompt}`;
      break;
    case GenerationStyle.GLITCH_ART:
      stylePrompt = `Glitch art, digital distortion, chromatic aberration, data moshing, VHS static, cyber error aesthetic. ${config.prompt}`;
      break;
    case GenerationStyle.LINE_ART:
      stylePrompt = `Line art drawing, black and white, continuous line, contour drawing, minimalist, clean strokes. ${config.prompt}`;
      break;
    case GenerationStyle.POP_ART:
      stylePrompt = `Pop art style, Andy Warhol inspired, bold solid colors, repetitive patterns, comic strip aesthetic. ${config.prompt}`;
      break;
    case GenerationStyle.SURREALISM:
      stylePrompt = `Surrealism art, dreamlike atmosphere, Salvador Dali inspired, bizarre shapes, melting objects, mysterious. ${config.prompt}`;
      break;
    case GenerationStyle.MINIMALIST:
      stylePrompt = `Minimalist design, simple shapes, plenty of negative space, soft colors, clean composition. ${config.prompt}`;
      break;
    case GenerationStyle.RETRO_WAVE:
      stylePrompt = `Retrowave/Synthwave style, 80s aesthetic, neon sunset, grid landscape, purple and cyan color palette. ${config.prompt}`;
      break;
    default: 
      stylePrompt = config.prompt;
  }

  // --- MODE SPECIFIC LOGIC ---
  if (config.mode === GenerationMode.COPY_IDEA) {
    finalPrompt = `${COPY_IDEA_SYSTEM_PROMPT}\n\n`;
    
    let conceptCount = 0;
    // Add Concept Images
    if (config.conceptImages && config.conceptImages.length > 0) {
      config.conceptImages.forEach((img, index) => {
        parts.push({
            inlineData: { data: img.base64, mimeType: img.mimeType },
        });
        conceptCount++;
      });
      
      const imageRefs = Array.from({length: conceptCount}, (_, i) => `[IMAGE ${i + 1}]`).join(', ');
      finalPrompt += `${imageRefs} are the CONCEPT/STYLE REFERENCES.\n`;
    }
    
    // Add Subject Image
    if (config.subjectImage) {
      parts.push({
        inlineData: { data: config.subjectImage.base64, mimeType: config.subjectImage.mimeType },
      });
      finalPrompt += `[IMAGE ${conceptCount + 1}] is the SUBJECT REFERENCE.\n`;
      finalPrompt += `\nINSTRUCTIONS:
      - Transfer the visual style of the CONCEPT images to the SUBJECT image.
      - CONCEPT STYLE PRESERVATION: ${config.conceptStrength}%.
      - SUBJECT STRUCTURE PRESERVATION: ${config.subjectStrength}%.`;
    } else {
      finalPrompt += `\nINSTRUCTIONS:
      - Transfer the visual style of the CONCEPT images to the subject described below.
      - CONCEPT STYLE PRESERVATION: ${config.conceptStrength}%.`;
    }

    finalPrompt += `\n
    - USER DESCRIPTION (SUBJECT): ${config.prompt || 'Generate a subject based on common sense or creative interpretation'}
    - USER DESCRIPTION (CONCEPT): ${config.conceptPrompt || 'Keep style unchanged'}
    `;
  } else {
    // Creative Mode
    finalPrompt = stylePrompt;
    
    // Add Reference Images
    if (config.referenceImages && config.referenceImages.length > 0) {
      config.referenceImages.forEach((img) => {
        parts.push({
          inlineData: { data: img.base64, mimeType: img.mimeType },
        });
      });
      finalPrompt += `\n\nUse the provided image(s) as visual reference.`;
    }
  }

  // --- CONSTRAINTS ---
  const preservationConstraints: string[] = [];
  if (config.keepFace) preservationConstraints.push("EXACTLY preserve facial identity and features of the subject.");
  if (config.preservePose) preservationConstraints.push("Strictly maintain the body pose and gesture of the subject.");
  if (config.preserveExpression) preservationConstraints.push("Keep the facial expression (emotion) exactly the same.");
  if (config.preserveStructure) preservationConstraints.push("Maintain the structural lines, perspective, and object placement of the original image.");

  if (preservationConstraints.length > 0) {
    finalPrompt += `\n\nCRITICAL CONSTRAINTS:\n- ${preservationConstraints.join('\n- ')}`;
  }

  if (config.cameraAngle && config.cameraAngle !== 'NONE') {
    finalPrompt += `\n\nCAMERA ANGLE: ${config.cameraAngle.replace('_', ' ')}`;
  }

  // Push text to parts
  parts.push({ text: finalPrompt });

  // =========================================================
  // EXECUTION
  // =========================================================
  
  let lastError: any;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (config.model === GenerationModel.IMAGEN_ULTRA) {
        const response = await ai.models.generateImages({
          model: config.model,
          prompt: finalPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: config.aspectRatio,
          },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
          const imageBytes = response.generatedImages[0].image.imageBytes;
          return { url: `data:image/jpeg;base64,${imageBytes}` }; // Imagen typically doesn't return usage meta in same way
        }
        throw new Error("Không tìm thấy hình ảnh trong phản hồi của Imagen.");
      } 
      else {
        // --- FIX FOR GEMINI NANO BANANA (FLASH IMAGE) ---
        // 'imageSize' is NOT supported by gemini-2.5-flash-image, only by gemini-3-pro-image-preview
        const imageConfig: any = {
           aspectRatio: config.aspectRatio,
        };
        
        if (config.model === GenerationModel.GEMINI_PRO) {
             imageConfig.imageSize = config.resolution;
        }

        const response = await ai.models.generateContent({
          model: config.model, 
          contents: [{
             role: 'user',
             parts: parts,
          }],
          config: {
            imageConfig: imageConfig
          },
        });

        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          
          if (candidate.finishReason === 'SAFETY') {
             throw new Error("Yêu cầu bị từ chối do vi phạm quy tắc an toàn của Google (Safety Filter). Hãy thử điều chỉnh prompt.");
          }

          const content = candidate.content;
          const usage = response.usageMetadata as TokenUsage;

          if (content && content.parts) {
            let textFallback = "";
            for (const part of content.parts) {
              if (part.inlineData && part.inlineData.data) {
                return { 
                    url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                    usage: usage 
                };
              }
              if (part.text) {
                 textFallback += part.text;
              }
            }
            if (textFallback.trim()) {
                throw new Error(`AI không tạo ảnh mà phản hồi: "${textFallback.trim()}"`);
            }
          }
        }
        throw new Error("Không tìm thấy hình ảnh trong phản hồi của Gemini.");
      }

    } catch (error: any) {
      console.warn(`Image generation attempt ${attempt} failed:`, error);
      lastError = error;

      try { handleApiError(error); } catch(e) { throw e; }

      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Stop retrying if not a transient error
      break;
    }
  }

  console.error("Generation Failed after retries:", lastError);
  throw lastError || new Error("Hệ thống đang bận hoặc gặp lỗi, vui lòng thử lại sau.");
};