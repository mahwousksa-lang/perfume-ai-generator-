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

// ─── Vibe / Background Database ────────────────────────────────────────────────

export interface VibeData {
  label: string;
  description: string;
  lighting: string;
  mood: string;
  colorPalette: string;
  arabicLabel: string;
}

export const VIBE_MAP: Record<string, VibeData> = {
  royal_luxury: {
    label: 'Royal Luxury',
    arabicLabel: 'الفخامة الملكية',
    description:
      'inside an opulent royal palace hall with soaring golden columns, polished white Carrara marble floors with intricate geometric inlay, cascading crystal chandeliers, deep royal purple velvet drapes, and a golden throne in the soft background',
    lighting: 'dramatic warm golden hour shafts of light streaming through arched windows, volumetric god rays',
    mood: 'majestic, commanding, imperial, regal',
    colorPalette: 'deep navy, gold, ivory, burgundy',
  },
  modern_corporate: {
    label: 'Modern Corporate',
    arabicLabel: 'الأعمال العصرية',
    description:
      'in a 70th-floor penthouse corner office with floor-to-ceiling glass walls overlooking a glittering city skyline at golden hour, a minimalist walnut desk, architectural recessed lighting, and a sleek city energy',
    lighting: 'cool blue-grey ambient light from city sky, warm accent spotlights on subject, lens flare from city lights',
    mood: 'powerful, professional, ambitious, sharp',
    colorPalette: 'slate, charcoal, amber, white',
  },
  winter_cabin: {
    label: 'Winter Cabin',
    arabicLabel: 'الكوخ الشتوي',
    description:
      'inside a luxurious alpine mountain chalet with exposed dark timber beams, a large crackling stone fireplace, premium cognac leather furniture, Persian kilim rugs, and snow-heavy pine trees visible through panoramic windows',
    lighting: 'intimate amber firelight dancing across the scene, soft snow-diffused daylight, warm shadow play',
    mood: 'warm, intimate, refined, contemplative',
    colorPalette: 'burnt amber, deep brown, cream, forest green',
  },
  classic_library: {
    label: 'Classic Library',
    arabicLabel: 'المكتبة الكلاسيكية',
    description:
      'inside a private grand mahogany library with floor-to-ceiling shelves of leather-bound books, a rolling brass ladder, deep Chesterfield armchairs, a Tiffany lamp, a bronze globe, and Persian rugs on dark hardwood floors',
    lighting: 'warm brass reading lamp light mixed with soft candlelight, golden hour slanting through a high casement window',
    mood: 'intellectual, timeless, distinguished, powerful',
    colorPalette: 'cognac, mahogany, forest green, gold',
  },
  desert_sunset: {
    label: 'Desert Sunset',
    arabicLabel: 'غروب الصحراء',
    description:
      'standing atop a grand sweeping sand dune in the Arabian Rub al Khali desert, vast ocean of gold and rust-colored dunes receding to the horizon, ancient stone ruins silhouetted in the far distance, solitary camel caravan silhouette',
    lighting: 'spectacular golden hour sunset, sky blazing in deep orange, crimson, and violet, dramatic long golden shadows',
    mood: 'epic, ancestral, adventurous, heritage',
    colorPalette: 'deep orange, sand gold, burnt sienna, indigo',
  },
  oriental_palace: {
    label: 'Oriental Palace',
    arabicLabel: 'القصر الشرقي',
    description:
      'inside a magnificent Andalusian-Islamic palace courtyard, intricate hand-painted geometric zellige tilework, a central alabaster fountain with softly cascading water, jasmine-draped horseshoe arches, ornate carved plasterwork, lush garden in the background',
    lighting: 'romantic early evening, brass Moroccan lanterns casting star-pattern light, deep blue dusk sky above the courtyard',
    mood: 'romantic, heritage, mystical, cultural',
    colorPalette: 'cobalt blue, terracotta, gold leaf, emerald',
  },
  modern_minimalist: {
    label: 'Modern Minimalist',
    arabicLabel: 'الأناقة البسيطة',
    description:
      'in an ultra-minimalist polished concrete and glass architectural studio, a single abstract sculpture on a plinth, floating shelves with negative space, precise diagonal light shafts from a clerestory window',
    lighting: 'pristine clean softbox studio lighting, precise shadow control, razor-sharp definition, white-grey tones',
    mood: 'avant-garde, pure, conceptual, future-forward',
    colorPalette: 'cool grey, white, black, single gold accent',
  },
  ocean_breeze: {
    label: 'Ocean Breeze',
    arabicLabel: 'نسيم البحر',
    description:
      'on the bow deck of a magnificent luxury superyacht gliding through turquoise Mediterranean waters, the white hull cutting a crisp wake, Amalfi coast cliffs and cypress trees in the background, clear endless sky',
    lighting: 'bright Mediterranean high-sun, soft sea-surface reflected light from below, warm tropical glow',
    mood: 'free, affluent, sun-drenched, adventurous',
    colorPalette: 'cerulean blue, crisp white, sun gold, sea foam',
  },
};

// ─── Attire Database ────────────────────────────────────────────────────────────

export interface AttireData {
  label: string;
  description: string;
  arabicLabel: string;
}

export const ATTIRE_MAP: Record<string, AttireData> = {
  white_thobe_black_bisht: {
    label: 'White Thobe + Black Bisht',
    arabicLabel: 'ثوب أبيض + بشت أسود',
    description:
      'a pristine snow-white Saudi thobe with fine gold embroidery at the collar and cuffs, draped with a sweeping jet-black bisht (ceremonial cloak) edged with a thick gold trim, a traditional white ghutrah headdress secured with a black agal crown',
  },
  charcoal_suit_gold_tie: {
    label: 'Charcoal Suit + Gold Tie',
    arabicLabel: 'بدلة رمادية + ربطة عنق ذهبية',
    description:
      'a perfectly tailored charcoal grey double-breasted suit with ultra-fine chalk stripe texture, crisp white French cuff dress shirt, a lustrous 22-karat gold silk tie with a confident half-Windsor knot, and a matching gold pocket square with three peaks',
  },
  white_thobe_only: {
    label: 'White Thobe Only',
    arabicLabel: 'ثوب أبيض فقط',
    description:
      'an immaculate crisp white thobe with subtle silver and white thread embroidery in a traditional geometric pattern along the collar, wearing no headdress, revealing a neat well-groomed short dark hairstyle, relaxed yet dignified',
  },
  navy_suit: {
    label: 'Navy Blue Suit',
    arabicLabel: 'بدلة زرقاء داكنة',
    description:
      'a sharp midnight navy blue slim-fit suit with peak lapels, a bright white dress shirt with gold cufflinks on French cuffs, a thin brushed silver tie with a subtle texture, minimal but clearly expensive accessories',
  },
  beige_thobe_brown_bisht: {
    label: 'Beige Thobe + Brown Bisht',
    arabicLabel: 'ثوب بيج + بشت بني',
    description:
      'a warm camel-beige thobe with intricate brown thread embroidery in a traditional arabesque pattern, draped with a rich chocolate-brown bisht generously trimmed with a wide band of gold metallic thread, a matching cream-toned ghutrah',
  },
};

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

// ─── Option Helpers ──────────────────────────────────────────────────────────────

export function getVibeOptions() {
  return Object.entries(VIBE_MAP).map(([value, data]) => ({
    value,
    label: data.label,
    arabicLabel: data.arabicLabel,
  }));
}

export function getAttireOptions() {
  return Object.entries(ATTIRE_MAP).map(([value, data]) => ({
    value,
    label: data.label,
    arabicLabel: data.arabicLabel,
  }));
}
