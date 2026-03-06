// ============================================================
// lib/promptEngine.ts  — Mahwous Perfume AI Campaign Generator
// Hybrid Pipeline: FLUX LoRA (character stability) + Gemini (Nano Banana quality)
// ============================================================
// @ts-nocheck

import type { GenerationRequest } from './types';

// ─── MAHWOUS CHARACTER BASE DESCRIPTION ──────────────────────────────────────
const CHARACTER_BASE = `a stylish Arab man with black swept-back hair, thick full black beard, 
rendered in high-quality 3D animated Pixar/Disney CGI style with photorealistic textures and cinematic lighting. 
He wears an elegant black suit with subtle gold trim details on the lapels, crisp white shirt, gold silk tie, 
and a gold pocket square. His expression is confident and charming, smiling warmly at the camera.`;

// ─── SCENE / BACKGROUND ──────────────────────────────────────────────────────
function getSceneDescription(vibe: string, notes?: string | string[]): string {
  const notesList: string[] = Array.isArray(notes)
    ? notes
    : typeof notes === 'string' && notes.trim()
    ? notes.split(/[,،•\n]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  const hasFloral = notesList.some(n => /rose|jasmine|floral|flower|ورد|ياسمين|زهر/i.test(n));
  const hasOud = notesList.some(n => /oud|wood|sandalwood|عود|خشب|صندل/i.test(n));
  const hasOcean = notesList.some(n => /ocean|sea|marine|aqua|بحر|مائي/i.test(n));
  const hasCitrus = notesList.some(n => /citrus|lemon|bergamot|حمضيات|ليمون|برغموت/i.test(n));

  const vibeMap: Record<string, string> = {
    rose_garden: 'luxurious marble palace room with tall arched windows, pink roses and white flowers, warm golden sunset light, ornate golden Arabic decorations',
    majlis: 'opulent Arabian royal majlis interior, dark wood paneling with golden geometric Islamic patterns, warm amber lighting from ornate brass lanterns, rich Persian carpets, incense smoke rising gently',
    royal_luxury: 'grand royal palace hall with massive golden chandeliers, marble columns, deep red velvet drapes, golden ornate decorations, regal atmosphere',
    modern_corporate: 'sleek modern luxury office with floor-to-ceiling glass windows overlooking a city skyline at golden hour, minimalist black and gold interior',
    winter_cabin: 'cozy luxury mountain cabin with stone fireplace, warm amber lighting, snow visible through large windows, rich wooden interior with gold accents',
    classic_library: 'grand classical library with tall mahogany bookshelves, warm golden reading lamps, leather armchairs, ornate wooden ceiling',
    desert_sunset: 'dramatic Arabian desert at golden sunset, sand dunes glowing in warm orange light, luxury tent with golden decorations in background',
    oriental_palace: 'magnificent oriental palace with ornate golden arches, intricate Islamic geometric patterns, warm amber lanterns, marble floors with golden inlays',
    modern_minimalist: 'ultra-modern minimalist luxury space with white marble, subtle gold accents, dramatic directional lighting, clean geometric lines',
    ocean_breeze: 'modern luxury penthouse with floor-to-ceiling ocean view windows, crystal blue sea, white marble interior with silver accents, fresh coastal atmosphere',
  };

  if (vibe && vibeMap[vibe]) return vibeMap[vibe];

  if (hasOud) return 'opulent Arabian royal palace interior, dark wood paneling with golden geometric Islamic patterns, warm amber lighting from ornate brass lanterns, rich Persian carpets, incense smoke rising gently, golden Arabic coffee pot dallah on a side table';
  if (hasFloral) return 'luxurious marble palace room with tall arched windows, deep emerald green velvet curtains, pink roses and white flowers visible through the window, warm golden sunset light streaming in';
  if (hasOcean) return 'modern luxury penthouse with floor-to-ceiling ocean view windows, crystal blue sea visible in the background, white marble interior with silver accents, cool blue ambient lighting';
  if (hasCitrus) return 'bright modern luxury terrace overlooking Mediterranean sea, white marble balustrade, lemon trees in background, warm Mediterranean sunlight';

  return 'magnificent Arabian palace interior with ornate golden arches, intricate Islamic geometric patterns, warm amber lanterns, marble floors with golden inlays, luxurious atmosphere';
}

// ─── BOTTLE DESCRIPTION ──────────────────────────────────────────────────────
function getBottleDescription(name: string, brand: string, bottleDescription?: string): string {
  if (bottleDescription?.trim()) {
    return `He is holding the EXACT perfume bottle shown in the reference image: ${bottleDescription}. The bottle must appear IDENTICAL to the reference image with the same shape, colors, label text, and cap.`;
  }

  const lower = (name + ' ' + brand).toLowerCase();

  if ((lower.includes('ameer') && lower.includes('oud')) || lower.includes('أمير العود') || lower.includes('ameer al oudh')) {
    return `He is holding up a PHOTOREALISTIC Lattafa Ameer Al Oudh perfume bottle - rectangular tall glass bottle with dark brown-to-amber gradient liquid inside, transparent clear glass, white Arabic calligraphy text "أمير العود" and English text "Ameer Al Oudh" on front, large square crystal-clear transparent cap with beveled edges.`;
  }
  if (lower.includes('bvlgari') || lower.includes('bulgari')) {
    return `He is holding up a PHOTOREALISTIC Bvlgari perfume bottle - sleek modern glass bottle with silver metallic accents, BVLGARI logo engraved on the front, premium luxury packaging.`;
  }
  if (lower.includes('good girl') || lower.includes('carolina herrera')) {
    return `He is holding up a PHOTOREALISTIC Carolina Herrera Good Girl perfume bottle - iconic stiletto high-heel shaped bottle in deep burgundy red glass, black butterfly-shaped cap on top, gold metallic base.`;
  }
  if (lower.includes('chanel') || lower.includes('شانيل')) {
    return `He is holding up a PHOTOREALISTIC Chanel perfume bottle - iconic rectangular clear glass bottle with black cap, CHANEL logo in black letters.`;
  }
  if (lower.includes('oud') || lower.includes('عود') || lower.includes('bois')) {
    return `He is holding up a PHOTOREALISTIC luxury oud perfume bottle with dark amber glass, golden Arabic calligraphy, heavy crystal-cut base, golden metallic cap.`;
  }

  const bottleName = `${brand} ${name}`.trim();
  return `He is holding up a PHOTOREALISTIC ${bottleName} perfume bottle with elegant premium glass, luxury packaging with the brand name "${brand}" and product name "${name}" clearly visible on the label.`;
}

// ─── CHARACTER ATTIRE ─────────────────────────────────────────────────────────
function getCharacterDescription(attire: string): string {
  if (attire === 'white_thobe_only' || attire === 'white_thobe_black_bisht') {
    return `a stylish Arab man with black swept-back hair, thick full black beard, 
rendered in high-quality 3D animated Pixar/Disney CGI style with photorealistic textures and cinematic lighting. 
He wears a pristine white Saudi thobe${attire === 'white_thobe_black_bisht' ? ' with a black bisht (cloak) over it' : ''}. 
His expression is confident and charming, smiling warmly at the camera.`;
  }
  if (attire === 'saudi_bisht') {
    return `a stylish Arab man with black swept-back hair, thick full black beard, 
rendered in high-quality 3D animated Pixar/Disney CGI style with photorealistic textures and cinematic lighting. 
He wears a white Saudi thobe with an elegant golden bisht (ceremonial cloak). 
His expression is confident and charming, smiling warmly at the camera.`;
  }
  return CHARACTER_BASE;
}

// ─── FLUX LoRA PROMPT (trigger word FIRST) ────────────────────────────────────
export function buildFluxPrompt(params: {
  perfumeData: { name: string; brand: string; notes?: string | string[]; description?: string };
  vibe?: string;
  attire?: string;
  aspectHint?: string;
  bottleDescription?: string;
  loraTriggerWord?: string;
}): string {
  const { perfumeData, vibe = '', attire = '', aspectHint = '', bottleDescription, loraTriggerWord = 'MAHWOUS_MAN' } = params;
  const { name = '', brand = '', notes } = perfumeData;

  const sceneDesc = getSceneDescription(vibe, notes);
  const bottleDesc = getBottleDescription(name, brand, bottleDescription);
  const characterDesc = getCharacterDescription(attire);

  // CRITICAL: trigger word MUST be first for LoRA activation
  return `${loraTriggerWord}, ${characterDesc.replace(/\n/g, ' ')}, holding a perfume bottle with right hand extended toward camera, ${bottleDesc.replace(/He is holding up a PHOTOREALISTIC /g, '').replace(/He is holding the EXACT perfume bottle shown in the reference image: /g, '')}, background: ${sceneDesc}, photorealistic 3D Pixar/Disney animation style, cinematic lighting, 4K quality${aspectHint ? `, ${aspectHint}` : ''}`;
}

// ─── GEMINI ENHANCEMENT PROMPT (Nano Banana style) ───────────────────────────
export function buildGeminiEnhancePrompt(params: {
  perfumeData: { name: string; brand: string; notes?: string | string[]; description?: string };
  vibe?: string;
  attire?: string;
  aspectHint?: string;
  bottleDescription?: string;
  hasBottleReference?: boolean;
}): string {
  const { perfumeData, vibe = '', attire = '', aspectHint = '', bottleDescription } = params;
  const { name = '', brand = '', notes } = perfumeData;

  const sceneDesc = getSceneDescription(vibe, notes);
  const bottleDesc = getBottleDescription(name, brand, bottleDescription);
  const characterDesc = getCharacterDescription(attire);

  const { hasBottleReference } = params;
  const bottleRefNote = hasBottleReference
    ? `\n\nREFERENCE IMAGE 2 (BOTTLE): The second attached image is the REAL product photo of the perfume bottle. You MUST reproduce this EXACT bottle in the scene — same shape, same colors, same label text, same cap design. The bottle in the final image must be IDENTICAL to this reference photo.`
    : '';

  return `Transform this image into a high-quality 3D animated Pixar/Disney CGI style image${aspectHint ? ` in ${aspectHint}` : ''}:

REFERENCE IMAGE 1 (CHARACTER): The first attached image shows the character generated by FLUX LoRA. Keep the EXACT same face, features, and identity. Do NOT change the character's face.${bottleRefNote}

CHARACTER: ${characterDesc}

BOTTLE: ${bottleDesc}
${notes ? `\nThe perfume "${name}" by ${brand} has notes of: ${Array.isArray(notes) ? notes.join(', ') : notes}` : ''}

POSE: He is holding the perfume bottle naturally with his right hand raised and extended slightly toward the camera, presenting it proudly. The bottle is clearly visible and prominently featured.

BACKGROUND: ${sceneDesc}

STYLE REQUIREMENTS:
- Photorealistic 3D animation quality (like Pixar/Disney movies — Nano Banana style)
- Cinematic professional lighting with dramatic shadows and highlights
- 4K ultra-high resolution, sharp focus throughout
- The perfume bottle MUST be PHOTOREALISTIC and IDENTICAL to the reference product photo
- Rich colors, global illumination, subsurface scattering on skin
- Professional perfume marketing campaign quality
- No text overlays, no watermarks

CRITICAL PRIORITIES:
1. Character face must match reference image 1
2. Perfume bottle must be IDENTICAL to reference image 2 (exact shape, label, colors)
3. Overall quality must be Pixar/Disney 3D animation (Nano Banana style)`;
}

// ─── LEGACY buildGeminiPrompt (backward compatibility) ───────────────────────
export function buildGeminiPrompt(params: {
  perfumeData: { name: string; brand: string; notes?: string | string[]; description?: string };
  vibe?: string;
  attire?: string;
  aspectHint?: string;
  bottleDescription?: string;
}): string {
  return buildGeminiEnhancePrompt(params);
}

// ─── LEGACY buildPrompt (for backward compatibility) ─────────────────────────
export function buildPrompt(request: GenerationRequest & { loraTriggerWord?: string }): string {
  return buildFluxPrompt({
    perfumeData: request.perfumeData,
    vibe: request.vibe,
    attire: request.attire,
    bottleDescription: request.bottleDescription,
    loraTriggerWord: request.loraTriggerWord,
  });
}

// ─── NEGATIVE PROMPT ─────────────────────────────────────────────────────────
export function buildNegativePrompt(): string {
  return [
    'deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy',
    'extra limb, missing limb, floating limbs, mutated hands and fingers',
    'disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation',
    'text, watermark, signature, jpeg artifacts, low quality, error, incoherent',
    'realistic human face, photorealistic skin, real person, photograph',
    'multiple characters, crowd, duplicate character',
    'wrong bottle shape, incorrect label, blurry bottle, distorted perfume bottle',
  ].join(', ');
}

// ─── Legacy generatePrompt ────────────────────────────────────────────────────
export function generatePrompt(params: any): { prompt: string; negative_prompt: string } {
  const request: GenerationRequest = {
    perfumeData: {
      name: params?.perfumeName || '',
      brand: params?.brand || '',
      notes: params?.notes || [],
    },
    vibe: params?.vibe || '',
    attire: params?.attire || '',
  };
  return {
    prompt: buildPrompt(request),
    negative_prompt: buildNegativePrompt(),
  };
}
