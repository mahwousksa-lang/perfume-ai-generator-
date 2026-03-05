// ============================================================
// lib/promptEngine.ts — SERVER-SIDE ONLY — SELF-CONTAINED
// ============================================================
// STYLE: High-end 3D Animation (Pixar/Disney CGI)
// CHARACTER: Mahwous mascot — Arab man, neat beard, big brown eyes
//
// ✅ لا imports خارجية عدا type — مستقل 100% من webpack bundling issues
// ✅ trigger_word أول token دائماً لأعلى LoRA attention weight
// ✅ VIBE_MAP + ATTIRE_MAP مضمّنة محلياً
// ============================================================

import type { GenerationRequest } from './types';

// ─── Vibe Map ─────────────────────────────────────────────────────────────────

const VIBE_MAP: Record<string, {
  description: string;
  lighting: string;
  mood: string;
}> = {
  royal_luxury: {
    description:
      'inside an opulent royal palace hall, soaring golden columns, polished white marble floors with geometric inlay, cascading crystal chandeliers, deep purple velvet drapes, golden throne softly visible in background',
    lighting:
      'warm dramatic golden shafts from arched windows, volumetric god rays, deep rich shadows',
    mood: 'majestic, commanding, regal, imperial',
  },
  modern_corporate: {
    description:
      'in a sleek 70th-floor penthouse corner office, floor-to-ceiling glass walls with glittering city skyline at dusk, minimalist walnut desk, architectural recessed lighting',
    lighting:
      'cool blue-grey city ambient light, warm accent spotlights on subject, soft lens flare',
    mood: 'confident, powerful, professional, sharp',
  },
  winter_cabin: {
    description:
      'inside a luxurious alpine chalet, dark timber beams, large crackling stone fireplace, cognac leather furniture, Persian kilim rugs, snow-heavy pine trees through panoramic windows',
    lighting:
      'intimate amber firelight dancing across the scene, snow-diffused soft daylight, warm shadows',
    mood: 'warm, intimate, refined, contemplative',
  },
  classic_library: {
    description:
      'inside a grand private mahogany library, floor-to-ceiling leather-bound books, rolling brass ladder, deep Chesterfield armchair, Tiffany lamp, bronze globe, Persian rugs on dark hardwood',
    lighting:
      'warm brass lamp glow, soft candlelight, golden hour slanting through high casement window',
    mood: 'intellectual, timeless, distinguished, powerful',
  },
  desert_sunset: {
    description:
      'atop a dramatic Arabian sand dune, vast Rub al Khali desert stretching to horizon, ancient ruins silhouette in distance, camel caravan far behind',
    lighting:
      'breathtaking golden hour sunset, blazing orange-crimson-violet sky, long dramatic golden shadows',
    mood: 'epic, ancestral, adventurous, heritage',
  },
  oriental_palace: {
    description:
      'inside a magnificent Andalusian-Islamic palace courtyard, intricate zellige tilework, alabaster fountain with cascading water, jasmine-draped horseshoe arches, ornate carved plasterwork',
    lighting:
      'romantic early evening, brass Moroccan lanterns casting star patterns, deep blue dusk sky overhead',
    mood: 'romantic, mystical, heritage, cultural',
  },
  modern_minimalist: {
    description:
      'in an ultra-minimalist polished concrete studio, single sculptural object on a plinth, floating shelves, precise diagonal light shafts from clerestory windows',
    lighting:
      'clean softbox studio lighting, sharp controlled shadows, pristine white-grey tones',
    mood: 'pure, conceptual, avant-garde, future-forward',
  },
  ocean_breeze: {
    description:
      'on the bow deck of a luxury superyacht gliding through turquoise Mediterranean waters, Amalfi coast cliffs in background, crisp white hull, endless blue sky',
    lighting:
      'bright Mediterranean sun, sea-reflected light from below, warm tropical glow',
    mood: 'free, affluent, sun-drenched, adventurous',
  },
};

// ─── Attire Map ───────────────────────────────────────────────────────────────

const ATTIRE_MAP: Record<string, { description: string }> = {
  white_thobe_black_bisht: {
    description:
      'pristine snow-white Saudi thobe with fine gold embroidery at collar and cuffs, sweeping jet-black bisht cloak edged with thick gold trim, traditional white ghutrah headdress with black agal crown',
  },
  charcoal_suit_gold_tie: {
    description:
      'perfectly tailored charcoal grey double-breasted suit, crisp white French-cuff dress shirt, lustrous gold silk tie with confident half-Windsor knot, matching gold pocket square',
  },
  white_thobe_only: {
    description:
      'immaculate crisp white thobe with subtle silver geometric embroidery at collar, no headdress, neat well-groomed short dark hairstyle, relaxed yet dignified',
  },
  navy_suit: {
    description:
      'sharp midnight navy slim-fit suit with peak lapels, bright white dress shirt with gold cufflinks, brushed silver tie, minimal but expensive-looking accessories',
  },
  beige_thobe_brown_bisht: {
    description:
      'warm camel-beige thobe with brown arabesque embroidery, rich chocolate-brown bisht trimmed with wide gold metallic band, matching cream-toned ghutrah',
  },
};

// ─── buildPrompt ─────────────────────────────────────────────────────────────
//
// STYLE: Pixar / Disney 3D CGI Animation — NOT photorealistic
//
// Character reference (Mahwous mascot as seen in brand image):
//   • 3D cartoon Arab man, mid-30s
//   • Big expressive warm brown eyes — signature Pixar trait
//   • Neat trimmed goatee beard, stylized but detailed
//   • Smooth 3D stylized skin with subtle shading
//   • Slightly exaggerated proportions (larger head, expressive face)
//   • Warm olive-tan skin, friendly confident expression
//
// HAND-BOTTLE TECHNIQUE (kept precise for composite in post):
//   • Right hand open-palm presentation pose (not gripping)
//     OR natural grip — both described so model can choose
//   • Wrist angle 15° toward camera = full label visibility
//   • Bottle at chest-waist height
// ─────────────────────────────────────────────────────────────────────────────

export function buildPrompt(request: GenerationRequest): string {
  const {
    perfumeData,
    vibe,
    attire,
    loraTriggerWord,
    bottleDescription,
  } = request;

  const vibeData   = VIBE_MAP[vibe]    ?? VIBE_MAP['royal_luxury'];
  const attireData = ATTIRE_MAP[attire] ?? ATTIRE_MAP['white_thobe_black_bisht'];

  // ── LAYER 1: Trigger word — أول token = أعلى attention weight ──────────────
  const triggerPrefix = loraTriggerWord?.trim()
    ? `${loraTriggerWord.trim()}, `
    : '';

  // ── Bottle reference ────────────────────────────────────────────────────────
  const bottleRef = bottleDescription?.trim()
    ? `${perfumeData.name} by ${perfumeData.brand} perfume bottle (${bottleDescription.trim()})`
    : `${perfumeData.name} by ${perfumeData.brand} perfume bottle`;

  const parts: string[] = [
    // 1. LoRA trigger (mandatory first position)
    triggerPrefix,

    // 2. Style declaration — Pixar/Disney 3D CGI (NOT photorealistic)
    'high-end 3D animation render, Pixar Disney CGI style, smooth stylized 3D character,',

    // 3. Character — Mahwous mascot
    'charming Arab man in his mid-30s, big expressive warm brown eyes with thick lashes, neatly trimmed goatee beard stylized in 3D, smooth olive-tan 3D skin with subtle cel shading, slightly larger expressive Pixar-style head, warm friendly confident smile,',

    // 4. Attire
    `wearing ${attireData.description},`,

    // 5. Environment
    `${vibeData.description},`,

    // 6. Lighting
    `${vibeData.lighting},`,

    // 7. Hand-bottle interaction (precise for bottle compositing)
    `presenting the ${bottleRef} held naturally in his right hand at chest height, thumb along side, fingers gently curved underneath, wrist tilted 15 degrees toward viewer so the front label is fully visible and legible, arm slightly bent,`,

    // 8. Bottle rendering
    'bottle rendered with accurate 3D glass material, light refractions, crisp legible label, correct proportions,',

    // 9. Pose & mood
    `posture is ${vibeData.mood}, weight naturally shifted, genuine confident expression, gaze toward camera,`,

    // 10. Technical quality (3D animation standard)
    'studio-quality 3D render, subsurface scattering on skin, global illumination, soft ambient occlusion, 8K resolution, cinematic shallow DOF, professional 3D commercial advertisement, Pixar render quality, no grain, clean smooth surfaces.',
  ];

  return parts
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── buildNegativePrompt ──────────────────────────────────────────────────────

export function buildNegativePrompt(): string {
  return [
    'photorealistic, photo, photograph, hyperrealistic, DSLR, camera photo,',
    'blurry, low quality, low resolution, ugly, deformed, disfigured,',
    'mutated hands, extra fingers, missing fingers, six fingers, fused fingers, wrong hand anatomy,',
    'floating bottle, bottle clipping, obscured label, distorted label, misspelled label,',
    'multiple people, two men, background figures, crowd,',
    'anime, 2D, flat shading, cell shading, illustration, painting, sketch,',
    'watermark, text overlay, logo bug, frame, border,',
    'overexposed, underexposed, washed out,',
    'bad proportions, rigid pose, stiff mannequin,',
    'nsfw, explicit.',
  ]
    .join(' ')
    .trim();
}
