// ============================================================
// lib/promptEngine.ts
// Dynamically constructs optimized AI prompts for each generation.
//
// KEY TECHNIQUE: The hand-bottle interaction is solved by:
// 1. Specifying exact finger placement in anatomical terms
// 2. Describing the bottle's physical dimensions so the AI
//    allocates the correct grip width and hand scale
// 3. Using the LoRA trigger word first (highest attention weight)
// 4. Describing the scene in layers: character → environment →
//    interaction → lighting → quality
// ============================================================

import { GenerationRequest } from './types';
import { VIBE_MAP, ATTIRE_MAP } from './vibeOptions';

// أعد تصدير الأنواع والخرائط للاستخدام في الخادم
export type { VibeData, AttireData } from './vibeOptions';
export { VIBE_MAP, ATTIRE_MAP, getVibeOptions, getAttireOptions } from './vibeOptions';

// ─── Main Prompt Builder ─────────────────────────────────────────────────────────

/**
 * Builds the optimized positive prompt.
 *
 * HAND-BOTTLE FIDELITY TECHNIQUE:
 * - Specifies which hand (right) and exact anatomical grip details
 * - Requests a specific bottle tilt angle (15°) so label faces camera
 * - Uses "bottle in background of hold" framing to prevent clipping
 * - Requests glass transparency and label legibility explicitly
 * - References the bottle description (from AI analysis) for shape accuracy
 */
export function buildPrompt(request: GenerationRequest): string {
  const { perfumeData, vibe, attire, loraTriggerWord, bottleDescription } = request;

  const vibeData = VIBE_MAP[vibe];
  const attireData = ATTIRE_MAP[attire];

  const vibeDesc = vibeData?.description ?? vibe;
  const vibeLighting = vibeData?.lighting ?? 'cinematic lighting';
  const vibeMood = vibeData?.mood ?? 'confident';
  const attireDesc = attireData?.description ?? attire;

  // LoRA trigger word has highest attention weight when placed first
  const triggerPrefix = loraTriggerWord?.trim() ? `${loraTriggerWord.trim()}, ` : '';

  // Bottle description sourced from Claude Vision analysis for maximum fidelity
  const bottleRef = bottleDescription
    ? `The ${perfumeData.name} by ${perfumeData.brand} perfume bottle — ${bottleDescription} —`
    : `the ${perfumeData.name} by ${perfumeData.brand} perfume bottle`;

  return [
    // 1. LoRA trigger (highest attention)
    `${triggerPrefix}`,

    // 2. Subject definition
    `3D CGI photorealistic render of a single confident Arab man in his mid-30s, strong defined masculine facial features, well-groomed short dark beard with clean edges, warm olive skin tone with realistic subsurface scattering,`,

    // 3. Attire
    `wearing ${attireDesc},`,

    // 4. Environment
    `${vibeDesc},`,

    // 5. Lighting
    `${vibeLighting},`,

    // 6. CRITICAL — Hand-bottle interaction (anatomically precise)
    `He holds ${bottleRef} in his right hand using a natural relaxed power grip: thumb resting flat against the side panel, index through pinky fingers wrapped snugly around the lower two-thirds of the bottle, wrist tilted at 15 degrees toward camera so the front label is fully visible and legible, arm slightly bent at the elbow, bottle held at chest-to-waist height,`,

    // 7. Bottle rendering quality
    `perfectly rendered bottle with accurate glass refractions and transparency, crisp label with all text legible, correct proportions matching the reference, no label distortion,`,

    // 8. Pose & character mood
    `character posture is ${vibeMood}, weight shifted to one hip, subtle confident smile, gaze directed at camera,`,

    // 9. Technical quality
    `hyper-realistic Octane render, ultra-detailed surface textures, 8K resolution, cinematic shallow depth of field with focus plane spanning both face and bottle, professional commercial photography lighting, award-winning CGI advertisement, film grain, global illumination, ray-traced reflections.`,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Negative prompt — lists all the specific failure modes of AI hands and bottles
 */
export function buildNegativePrompt(): string {
  return [
    'blurry, low quality, low resolution, ugly, deformed, disfigured,',
    'mutated hands, extra fingers, missing fingers, six fingers, fused fingers, bent fingers, wrong hand anatomy, gloved hand, claw hand,',
    'floating bottle, bottle clipping through hand, bottle above fist, hand through bottle,',
    'obscured label, blurry label, distorted label, misspelled label, wrong bottle shape,',
    'multiple people, duplicate character, two men, background figures,',
    'anime, cartoon, 2D, flat shading, cell shading, illustration, painting,',
    'watermark, text overlay, logo bug, frame, border,',
    'overexposed, underexposed, washed out, desaturated,',
    'bad proportions, unnatural pose, rigid mannequin pose, stiff,',
    'jpeg artifacts, noise, compression, aliasing,',
    'nsfw, explicit, suggestive.',
  ]
    .join(' ')
    .trim();
}
