

import { GenerationModel } from "./types";

export const MODEL_NAME = 'gemini-3-pro-image-preview'; // Default fallback

export const MODEL_OPTIONS = [
  { id: GenerationModel.GEMINI_PRO, label: 'Nano Banana Pro (Gemini 3)', badge: 'Best', desc: 'Tốt nhất cho In áo & Sửa ảnh' },
  { id: GenerationModel.GEMINI_FLASH, label: 'Nano Banana (Flash)', badge: 'Fast', desc: 'Tốc độ cao' },
  { id: GenerationModel.IMAGEN_ULTRA, label: 'Imagen 4 Ultra', badge: 'Art', desc: 'Chuyên tạo ảnh nghệ thuật' },
  { id: GenerationModel.VEO_FAST, label: 'Veo 3.1 Fast', badge: 'Video', desc: 'Tạo video chuyển động' },
];

export const MODEL_LABELS: Record<string, string> = {
  [GenerationModel.GEMINI_PRO]: 'Nano Banana Pro',
  [GenerationModel.GEMINI_FLASH]: 'Nano Banana',
  [GenerationModel.IMAGEN_ULTRA]: 'Imagen 4 Ultra',
  [GenerationModel.VEO_FAST]: 'Veo 3.1',
};

export const CROP_RATIOS = [
  { label: 'Free (Tự do)', value: 0 },
  { label: '1:1 (Vuông)', value: 1 },
  { label: '16:9 (Ngang)', value: 16/9 },
  { label: '9:16 (Dọc)', value: 9/16 },
  { label: '4:3', value: 4/3 },
  { label: '3:4', value: 3/4 },
  { label: '2:1', value: 2 },
  { label: '1:2', value: 0.5 },
  { label: '2:3', value: 2/3 },
  { label: '3:2', value: 3/2 },
];

export const RESOLUTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

export const CAMERA_ANGLES = [
  { value: 'NONE', label: 'Tự động' },
  { value: 'EYE_LEVEL', label: 'Ngang tầm mắt (Eye Level)' },
  { value: 'LOW_ANGLE', label: 'Góc thấp (Low Angle)' },
  { value: 'HIGH_ANGLE', label: 'Góc cao (High Angle)' },
  { value: 'TOP_DOWN', label: 'Từ trên xuống (Top Down)' },
  { value: 'CLOSE_UP', label: 'Cận cảnh (Close Up)' },
  { value: 'WIDE_SHOT', label: 'Góc rộng (Wide Shot)' },
];

// Enhanced Styles List with Visual Properties
export const STYLES_LIST = [
  { id: 'AUTO', icon: '✨', label: 'Tự động', desc: 'AI tự chọn style', gradient: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' },
  { id: 'TSHIRT_DESIGN', icon: '👕', label: 'In Áo Pro', desc: 'Vector sạch, không nền', gradient: 'bg-gradient-to-br from-slate-900 to-slate-700' },
  { id: 'IPHONE_RAW', icon: '🤳', label: 'iPhone Raw', desc: 'Đời thường, Flash, Real', gradient: 'bg-gradient-to-br from-stone-400 to-stone-600' },
  { id: 'REALISTIC', icon: '📸', label: 'Studio Real', desc: '8K, Cinematic Light', gradient: 'bg-gradient-to-br from-neutral-800 to-black' },
  { id: 'CINEMATIC', icon: '🎬', label: 'Cinematic', desc: 'Movie Scene, Dramatic', gradient: 'bg-gradient-to-br from-amber-900 to-black' },
  { id: '3D_RENDER', icon: '🧊', label: '3D Render', desc: 'Blender, Octane', gradient: 'bg-gradient-to-br from-cyan-400 to-blue-600' },
  { id: 'ANIME', icon: '🌸', label: 'Anime', desc: 'Ghibli, Vibrant', gradient: 'bg-gradient-to-br from-pink-300 to-rose-400' },
  { id: 'CYBERPUNK', icon: '🌃', label: 'Cyberpunk', desc: 'Neon, Future', gradient: 'bg-gradient-to-br from-fuchsia-600 to-purple-900' },
  { id: 'IPHONE_PHOTO', icon: '📱', label: 'iPhone Studio', desc: 'Ảnh đẹp, Sắc nét', gradient: 'bg-gradient-to-br from-blue-100 to-blue-300 text-slate-800' },
  { id: 'VECTOR', icon: '🎨', label: 'Vector Art', desc: 'Flat, Minimal', gradient: 'bg-gradient-to-br from-orange-400 to-red-500' },
  { id: 'COMIC_BOOK', icon: '💥', label: 'Comic Book', desc: 'Halftone, Bold', gradient: 'bg-gradient-to-br from-yellow-400 to-red-600 text-black' },
  { id: 'PIXEL_ART', icon: '👾', label: 'Pixel Art', desc: '8-bit, Retro', gradient: 'bg-gradient-to-br from-green-400 to-emerald-700' },
  { id: 'STEAMPUNK', icon: '⚙️', label: 'Steampunk', desc: 'Gears, Brass', gradient: 'bg-gradient-to-br from-yellow-700 to-orange-900' },
  { id: 'GLITCH_ART', icon: '📺', label: 'Glitch Art', desc: 'Distortion, Noise', gradient: 'bg-gradient-to-br from-red-500 via-green-500 to-blue-500' },
  { id: 'WATERCOLOR', icon: '🎨', label: 'Watercolor', desc: 'Soft, Flowing', gradient: 'bg-gradient-to-br from-sky-300 via-purple-300 to-pink-300 text-slate-800' },
  { id: 'OIL_PAINTING', icon: '🖼️', label: 'Oil Painting', desc: 'Texture, Canvas', gradient: 'bg-gradient-to-br from-yellow-600 to-red-800' },
  { id: 'POP_ART', icon: '🥫', label: 'Pop Art', desc: 'Warhol, Colorful', gradient: 'bg-gradient-to-br from-yellow-300 via-pink-500 to-cyan-400 text-black' },
  { id: 'SURREALISM', icon: '👁️', label: 'Surrealism', desc: 'Dreamy, Dali', gradient: 'bg-gradient-to-br from-indigo-800 to-purple-900' },
  { id: 'MINIMALIST', icon: '🔹', label: 'Minimalist', desc: 'Clean, Negative Space', gradient: 'bg-gradient-to-br from-gray-100 to-gray-300 text-slate-800' },
  { id: 'RETRO_WAVE', icon: '📼', label: 'Retro Wave', desc: '80s, Synthwave', gradient: 'bg-gradient-to-br from-purple-600 to-pink-600' },
];

export const TSHIRT_SYSTEM_PROMPT = `
Bạn là AI chuyên tái tạo và làm sạch thiết kế in áo từ ảnh người dùng gửi.
NHIỆM VỤ CHÍNH:
- Nhận ảnh người dùng gửi
- Tái tạo thiết kế theo chuẩn in áo (sắc nét, rõ ràng, sạch sẽ)
- Hiểu và thực hiện đúng mọi yêu cầu chỉnh sửa của người dùng
- Luôn tuân thủ các quy tắc xử lý bắt buộc bên dưới

────────────────────────────────────
I. QUY TẮC XỬ LÝ BẮT BUỘC
────────────────────────────────────
1. Phát hiện và crop chính xác vùng chứa thiết kế.
2. Xoay thẳng và chỉnh phối cảnh nếu bị nghiêng.
3. Làm nét, tăng tương phản, loại bỏ nhiễu và vẽ lại nét sạch sẽ.
4. Xuất thiết kế.
5. Nền mặc định: TRẮNG hoàn toàn (trừ khi yêu cầu khác).
6. Chất lượng ảnh cực cao.
7. Chỉ trả về hình ảnh, không giải thích dài dòng.
`;

export const IPHONE_SYSTEM_PROMPT = `
You are a professional photographer using an iPhone 15 Pro Max.
GOAL: Create a photo that looks 100% authentic, candid, and "shot on iPhone".

RULES:
1. Lighting: Natural, soft, slightly flat or diffused (like cloudy daylight or indoor window light). Avoid studio strobe looks.
2. Texture: Retain skin texture, slight noise is acceptable for realism. Avoid "plastic" AI smoothing.
3. Color: Natural colors, slightly desaturated or true-to-life (no HDR filters).
4. Vibe: Candid, snapshot style, everyday life authenticity.
5. NO aggressive bokeh (depth of field should be natural for a smartphone sensor).
6. NO TEXT/WATERMARKS: Do NOT include any text overlay, device name, "Shot on iPhone" text, date, or time in the image unless explicitly asked.
`;

export const IPHONE_RAW_SYSTEM_PROMPT = `
You are taking a quick, casual photo with an iPhone 13 Pro Max.
GOAL: MAXIMUM AUTHENTICITY & IMPERFECTION (Siêu đời thường).
This should NOT look like a professional photo. It should look like a random snapshot from a user's camera roll.

STRICT VISUAL RULES:
1.  **Imperfections:** Slight motion blur, hand shake, or digital noise is ALLOWED and ENCOURAGED to make it look real.
2.  **Lighting:** FLAT, AMBIENT, NATURAL light. Low contrast. NO studio lighting, NO perfect rim light. Shadows should be natural, even slightly messy.
3.  **Vibe:** Unposed, unpolished, candid, everyday life.
4.  **Face:** If a person is present, KEEP THE FACE 100% RAW. Retain all skin texture, pores, blemishes, and natural shadows. NO beauty filters, NO AI smoothing.
5.  **Camera:** Simulate an iPhone sensor (small sensor depth of field, digital sharpening artifacts).
6.  **NO TEXT:** Absolutely NO visible text indicating the camera model, date, time, or watermarks inside the image.
`;

export const COPY_IDEA_SYSTEM_PROMPT = `
TASK: Image Synthesis and Style Transfer.
You will be provided with two types of image inputs:
1. CONCEPT IMAGE(S): Defines the style, lighting, composition, color palette, and vibe.
2. SUBJECT IMAGE: Defines the main character, object, or person.

GOAL: Recreate the SUBJECT using the style and composition of the CONCEPT IMAGE.
`;

export const DEFAULT_VIDEO_PROMPT = `Tạo video mượt mà, chuyển động tự nhiên giữa hai frame. Không dùng hiệu ứng chuyển cảnh, không blur, không glitch. Camera chỉ được phép di chuyển nhẹ, hợp lý như thật (ví dụ: pan chậm, zoom nhẹ, dolly mượt). Giữ phong cách ánh sáng, màu sắc và phối cảnh nhất quán giữa hai hình. Không thay đổi khuôn mặt, trang phục, hoặc bối cảnh chính. Giữ chi tiết rõ nét, không bị nhoè hay rung. Phong cách tổng thể: tự nhiên, thực tế, không hiệu ứng. Hạn chế: không blur, không glitch, không morph khuôn mặt. Chuyển động camera: mô tả hướng (pan, tilt, zoom, dolly). Chi tiết kỹ thuật: giữ độ nét, ánh sáng và màu sắc đồng nhất.`;

export const EDIT_INPAINT_PROMPT = `
TASK: Image Editing (Inpainting).
You are provided with an IMAGE and a MASK (black/white).
WHITE pixels in the mask indicate the area to EDIT.
BLACK pixels in the mask indicate the area to KEEP EXACTLY THE SAME.

INSTRUCTIONS:
1. Modify ONLY the white masked region based on the user's prompt.
2. Seamlessly blend the new content with the existing surroundings (lighting, texture, perspective).
3. Do NOT change any content in the black unmasked region.
`;

export const EDIT_OUTPAINT_PROMPT = `
TASK: Image Outpainting (Expansion).
You are provided with an IMAGE that contains a central content area and transparent/white empty space around it.
The provided MASK highlights the empty space that needs filling.

INSTRUCTIONS:
1. Fill the empty space (Outpaint) to expand the scene naturally.
2. Match the style, lighting, and perspective of the original center image.
3. Do NOT modify the original center image details.
`;

export const EDIT_UPSCALE_PROMPT = `
TASK: High-Fidelity Upscaling.
GOAL: Increase resolution and sharpness while strictly preserving the original image's identity.

RULES:
1. DO NOT change facial features, expressions, or identity.
2. DO NOT add new objects or remove existing ones.
3. Maintain the original composition and color palette.
4. Only enhance details (texture, sharpness) and reduce noise.
5. Output must be high resolution.
`;

export const EDIT_SUPER_ZOOM_PROMPT = `
TASK: Super Zoom / Context Expansion.
You are provided with a central image fragment (the "Subject") surrounded by empty space (masked).
GOAL: Generate the surrounding context (background, body, environment) that logically connects to this central fragment.

RULES:
1. The central fragment (black mask area) MUST remain 100% unchanged.
2. The generated surrounding (white mask area) must blend seamlessly with the edges of the central fragment.
3. Infer the context from the subject (e.g., if the subject is a face, generate the neck and shoulders; if it's a building top, generate the street below).
4. Maintain high resolution and consistent lighting.
`;

export const PROMPT_ASSISTANT_SYSTEM_PROMPT = `
Bạn là Chuyên gia Prompt AI chuyên nghiệp (Expert AI Prompt Engineer).
MỤC TIÊU: Giúp người dùng tạo ra các Prompt (câu lệnh) chi tiết, chính xác và hiệu quả nhất để tạo ảnh bằng AI (Midjourney, Gemini, Stable Diffusion).

QUY TẮC TRẢ LỜI (BẮT BUỘC):
1. NGÔN NGỮ: Luôn trả lời bằng TIẾNG VIỆT.
2. CẤU TRÚC PHẢN HỒI: Không viết thành đoạn văn dài. Hãy tách Prompt thành các dòng riêng biệt theo cấu trúc sau để người dùng dễ chỉnh sửa:
   - Chủ thể (Subject): ...
   - Phong cách (Art Style): ...
   - Ánh sáng & Màu sắc (Lighting & Color): ...
   - Bố cục & Góc máy (Composition & Camera): ...
   - Chi tiết bổ sung (Details/Vibe): ...

3. NỘI DUNG:
   - Nếu người dùng gửi ảnh: Hãy phân tích kỹ bức ảnh và trích xuất Prompt dựa trên cấu trúc trên.
   - Nếu người dùng gửi ý tưởng: Hãy mở rộng ý tưởng đó thành một Prompt chuyên nghiệp, thêm các từ khóa nghệ thuật phù hợp.

4. FORMAT OUTPUT:
   Đặt toàn bộ nội dung Prompt vào trong một khối code (code block) hoặc làm nổi bật để người dùng dễ copy.
   Cuối cùng, hãy hỏi ngắn gọn: "Bạn muốn chỉnh sửa chi tiết nào không?"
`;