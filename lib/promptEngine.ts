// ============================================================
// lib/promptEngine.ts — SERVER-SIDE ONLY — SELF-CONTAINED
// ============================================================
// STYLE: Official Mahwous 3D Mascot (Pixar/Disney CGI)
// CHARACTER: Mahwous mascot — Arab man, neat beard, big brown eyes
//
// ✅ لا imports خارجية عدا type — مستقل 100% من webpack bundling issues
// ✅ trigger_word أول token دائماً لأعلى LoRA attention weight
// ✅ VIBE_MAP + ATTIRE_MAP مضمّنة محلياً
// ✅ محسن لضمان ثبات الشخصية الكرتونية 100%
// ============================================================

import type { GenerationRequest } from './types';

// ─── Vibe Map ─────────────────────────────────────────────────────────────────

const VIBE_MAP: Record<string, {
  description: string;
  lighting: string;
  mood: string;
}> = {
  rose_garden: {
    description:
      'in a lush, magical rose garden filled with dense blooming pink roses, glowing golden butterflies, soft morning mist, enchanted forest atmosphere, rose petals floating in the air',
    lighting:
      'soft diffused morning golden light filtering through the rose petals, magical warm glow, bokeh background',
    mood: 'romantic, enchanting, dreamy, serene',
  },
  majlis: {
    description:
      'in a luxurious modern Saudi majlis, rich green velvet curtains, ornate Arabic coffee pot (dallah) on a golden tray, small coffee cups (finjan), blooming flowers in the background, subtle oud smoke wisps',
    lighting:
      'soft warm interior lighting with natural light from an arched window, creating a welcoming and opulent atmosphere',
    mood: 'hospitable, traditional, luxurious, warm',
  },
  royal_luxury: {
    description:
      'inside an opulent royal palace hall, soaring white marble columns with gold accents, polished white marble floors with intricate geometric inlay, cascading crystal chandeliers, deep ivory velvet drapes, soft golden light from arched windows',
    lighting:
      'warm dramatic golden shafts from arched windows, volumetric god rays, deep rich shadows, cinematic depth',
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
      'inside a luxurious alpine chalet, dark timber beams, large crackling stone fireplace with blue flames, cognac leather furniture, snow-heavy pine trees through panoramic windows, snow-covered mountains visible',
    lighting:
      'intimate amber firelight dancing across the scene, cool blue light from the snow outside, warm shadows',
    mood: 'warm, intimate, refined, contemplative',
  },
  classic_library: {
    description:
      'inside a grand private mahogany library, floor-to-ceiling leather-bound books, rolling brass ladder, deep Chesterfield armchair, Tiffany lamp, lush tropical fern plants, Persian rugs on dark hardwood',
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
  black_suit_gold_details: {
    description:
      'wearing an impeccably tailored modern black suit with subtle gold embroidery on the lapels, crisp white shirt, and a shining gold tie with a gold pocket square',
  },
  saudi_bisht: {
    description:
      'wearing a traditional Saudi white thobe and a luxurious black bisht with wide gold trim, embodying Arabian heritage and elegance',
  },
  white_thobe_black_bisht: {
    description:
      'wearing a pristine snow-white Saudi thobe with fine gold embroidery at collar and cuffs, sweeping jet-black bisht cloak edged with thick gold trim, traditional white ghutrah headdress with black agal crown',
  },
  charcoal_suit_gold_tie: {
    description:
      'wearing a perfectly tailored charcoal grey double-breasted suit, crisp white French-cuff dress shirt, lustrous gold silk tie with confident half-Windsor knot, matching gold pocket square',
  },
  white_thobe_only: {
    description:
      'wearing an immaculate crisp white thobe with subtle silver geometric embroidery at collar, no headdress, neat well-groomed short dark hairstyle, relaxed yet dignified',
  },
  navy_suit: {
    description:
      'wearing a sharp midnight navy slim-fit suit with peak lapels, bright white dress shirt with gold cufflinks, brushed silver tie, minimal but expensive-looking accessories',
  },
  beige_thobe_brown_bisht: {
    description:
      'wearing a warm camel-beige thobe with brown arabesque embroidery, rich chocolate-brown bisht trimmed with wide gold metallic band, matching cream-toned ghutrah',
  },
};

// ─── buildPrompt ─────────────────────────────────────────────────────────────
//
// STYLE: Official Mahwous 3D Mascot (Pixar/Disney CGI)
//
// Character reference (Mahwous mascot):
//   • 3D cartoon Arab man, early 30s
//   • Large rounded head, Pixar proportions
//   • Smooth olive-cream skin
//   • Thick straight black eyebrows
//   • Big, warm, expressive brown eyes
//   • Neat trimmed black goatee beard
//   • Black hair swept back and to the side
//   • Black suit with gold embroidery, gold tie
//
// HAND-BOTTLE TECHNIQUE:
//   • Right hand natural grip at chest height
//   • Bottle fully visible with legible label
//   • Photorealistic glass rendering
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
  const attireData = ATTIRE_MAP[attire] ?? ATTIRE_MAP['black_suit_gold_details'];

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

    // 2. Style declaration — Official Mahwous 3D Mascot
    'official Mahwous 3D mascot, Pixar/Disney CGI style, 3D cartoon Arab man,',

    // 3. Character — Mahwous mascot (100% consistent features)
    'large rounded head with Pixar proportions, smooth olive-cream skin, thick straight black eyebrows, big warm expressive brown eyes, small straight nose, thin mustache line, neat trimmed black goatee beard covering chin and lower cheeks, black hair swept back and to the side with one strand falling on forehead, subtle warm friendly smile, looking directly at the viewer,',

    // 4. Attire
    attireData.description,

    // 5. Environment
    `${vibeData.description},`,

    // 6. Lighting
    `${vibeData.lighting},`,

    // 7. Hand-bottle interaction (precise for bottle compositing)
    `elegantly holding the ${bottleRef} in his right hand, presenting it clearly to the viewer with a natural elegant pose. The bottle is rendered with 100% accurate photorealistic glass material, accurate label text clearly visible, beautiful light refractions and reflections, correct proportions matching the real product,`,

    // 8. Pose & mood
    `posture is ${vibeData.mood}, weight naturally shifted, genuine confident expression,`,

    // 9. Technical quality (ultra-high quality render)
    'ultra-realistic 8K 3D render, Octane Render quality, cinematic composition, dramatic studio lighting, subsurface scattering on skin, global illumination, soft ambient occlusion, intricate details, flawless textures, professional commercial photography quality, masterpiece, award-winning.',
  ];

  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── buildNegativePrompt ──────────────────────────────────────────────────────

export function buildNegativePrompt(): string {
  return [
    'photorealistic, realistic, human, photo, photograph, DSLR, camera photo,',
    'ugly, deformed, disfigured, poor quality, blurry, low resolution,',
    'mutated hands, extra fingers, missing fingers, six fingers, fused fingers, wrong hand anatomy,',
    'floating bottle, bottle clipping, obscured label, distorted label, misspelled label,',
    'multiple people, two men, background figures, crowd,',
    'watermark, text overlay, logo bug, frame, border,',
    'overexposed, underexposed, washed out,',
    'bad proportions, rigid pose, stiff mannequin,',
    'nsfw, explicit.',
  ]
    .join(' ')
    .trim();
}
