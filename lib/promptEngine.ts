// ============================================================
// lib/promptEngine.ts — SERVER-SIDE ONLY
// ============================================================
//
// ✅ هذا الملف مستقل 100% — لا يعتمد على أي import خارجي
//    لضمان أن webpack/Next.js لا يُخرج buildPrompt كـ undefined.
//
// السبب التقني: re-export chains من vibeOptions.ts كانت تُربك
// webpack bundler في سياق الخادم وتُخرج الدوال كـ undefined.
// الحل: نسخة مضمّنة من VIBE_MAP و ATTIRE_MAP هنا مباشرة.
//
// HOW TRIGGER WORD WORKS:
//   loraTriggerWord يُوضع أول شيء في البرومبت — هذا يعطيه
//   أعلى attention weight في نموذج FLUX-LoRA مما يضمن
//   ظهور ملامح الشخصية المدرّبة بوضوح وثبات.
// ============================================================

import type { GenerationRequest } from './types';

// ─── Vibe Data (مضمّنة مباشرة — لا imports) ─────────────────────────────────

const VIBE_MAP: Record<string, {
  description: string;
  lighting: string;
  mood: string;
}> = {
  royal_luxury: {
    description:
      'inside an opulent royal palace hall with soaring golden columns, polished white Carrara marble floors with intricate geometric inlay, cascading crystal chandeliers, deep royal purple velvet drapes, and a golden throne in the soft background',
    lighting:
      'dramatic warm golden hour shafts of light streaming through arched windows, volumetric god rays',
    mood: 'majestic, commanding, imperial, regal',
  },
  modern_corporate: {
    description:
      'in a 70th-floor penthouse corner office with floor-to-ceiling glass walls overlooking a glittering city skyline at golden hour, a minimalist walnut desk, architectural recessed lighting',
    lighting:
      'cool blue-grey ambient light from city sky, warm accent spotlights, lens flare from city lights',
    mood: 'powerful, professional, ambitious, sharp',
  },
  winter_cabin: {
    description:
      'inside a luxurious alpine mountain chalet with exposed dark timber beams, a large crackling stone fireplace, premium cognac leather furniture, Persian kilim rugs, snow-heavy pine trees through panoramic windows',
    lighting:
      'intimate amber firelight dancing across the scene, soft snow-diffused daylight, warm shadow play',
    mood: 'warm, intimate, refined, contemplative',
  },
  classic_library: {
    description:
      'inside a private grand mahogany library with floor-to-ceiling shelves of leather-bound books, a rolling brass ladder, deep Chesterfield armchairs, a Tiffany lamp, a bronze globe, Persian rugs on dark hardwood floors',
    lighting:
      'warm brass reading lamp light mixed with soft candlelight, golden hour slanting through a high casement window',
    mood: 'intellectual, timeless, distinguished, powerful',
  },
  desert_sunset: {
    description:
      'standing atop a grand sweeping sand dune in the Arabian Rub al Khali desert, vast ocean of gold and rust-colored dunes receding to the horizon, ancient stone ruins silhouetted in the far distance',
    lighting:
      'spectacular golden hour sunset, sky blazing in deep orange, crimson, and violet, dramatic long golden shadows',
    mood: 'epic, ancestral, adventurous, heritage',
  },
  oriental_palace: {
    description:
      'inside a magnificent Andalusian-Islamic palace courtyard, intricate hand-painted geometric zellige tilework, a central alabaster fountain with softly cascading water, jasmine-draped horseshoe arches, ornate carved plasterwork',
    lighting:
      'romantic early evening, brass Moroccan lanterns casting star-pattern light, deep blue dusk sky above the courtyard',
    mood: 'romantic, heritage, mystical, cultural',
  },
  modern_minimalist: {
    description:
      'in an ultra-minimalist polished concrete and glass architectural studio, a single abstract sculpture on a plinth, floating shelves with negative space, precise diagonal light shafts from a clerestory window',
    lighting:
      'pristine clean softbox studio lighting, precise shadow control, razor-sharp definition, white-grey tones',
    mood: 'avant-garde, pure, conceptual, future-forward',
  },
  ocean_breeze: {
    description:
      'on the bow deck of a magnificent luxury superyacht gliding through turquoise Mediterranean waters, the white hull cutting a crisp wake, Amalfi coast cliffs and cypress trees in the background',
    lighting:
      'bright Mediterranean high-sun, soft sea-surface reflected light from below, warm tropical glow',
    mood: 'free, affluent, sun-drenched, adventurous',
  },
};

// ─── Attire Data (مضمّنة مباشرة — لا imports) ────────────────────────────────

const ATTIRE_MAP: Record<string, { description: string }> = {
  white_thobe_black_bisht: {
    description:
      'a pristine snow-white Saudi thobe with fine gold embroidery at the collar and cuffs, draped with a sweeping jet-black bisht (ceremonial cloak) edged with a thick gold trim, a traditional white ghutrah headdress secured with a black agal crown',
  },
  charcoal_suit_gold_tie: {
    description:
      'a perfectly tailored charcoal grey double-breasted suit with ultra-fine chalk stripe texture, crisp white French cuff dress shirt, a lustrous 22-karat gold silk tie with a confident half-Windsor knot, matching gold pocket square with three peaks',
  },
  white_thobe_only: {
    description:
      'an immaculate crisp white thobe with subtle silver and white thread embroidery in a traditional geometric pattern along the collar, wearing no headdress, revealing a neat well-groomed short dark hairstyle, relaxed yet dignified',
  },
  navy_suit: {
    description:
      'a sharp midnight navy blue slim-fit suit with peak lapels, a bright white dress shirt with gold cufflinks on French cuffs, a thin brushed silver tie with subtle texture, minimal but clearly expensive accessories',
  },
  beige_thobe_brown_bisht: {
    description:
      'a warm camel-beige thobe with intricate brown thread embroidery in a traditional arabesque pattern, draped with a rich chocolate-brown bisht generously trimmed with a wide band of gold metallic thread, a matching cream-toned ghutrah',
  },
};

// ─── buildPrompt ──────────────────────────────────────────────────────────────
//
// PROMPT LAYER ORDER (مُهم — الترتيب يؤثر على attention weights):
//   1. trigger_word  ← أول كلمة = أعلى وزن = أقوى استدعاء للـ LoRA
//   2. Subject       ← تعريف الشخصية
//   3. Attire        ← الزي
//   4. Environment   ← الخلفية والمشهد
//   5. Lighting      ← الإضاءة
//   6. Hand+Bottle   ← التفاصيل التشريحية للإمساك بالزجاجة
//   7. Bottle QA     ← جودة الزجاجة والملصق
//   8. Pose          ← وضعية الجسم
//   9. Tech Quality  ← معايير الجودة التقنية
//
// HAND-BOTTLE FIDELITY:
//   - تحديد اليد اليمنى + وصف تشريحي دقيق لكل إصبع
//   - زاوية ميل 15° لمواجهة الكاميرا = يظهر الملصق بالكامل
//   - وصف الزجاجة من Claude/Gemini Vision مُحقن هنا مباشرة
// ─────────────────────────────────────────────────────────────────────────────

export function buildPrompt(request: GenerationRequest): string {
  const {
    perfumeData,
    vibe,
    attire,
    loraTriggerWord,
    bottleDescription,
  } = request;

  // ── Lookup scene data with safe fallbacks ──────────────────────────────────
  const vibeData   = VIBE_MAP[vibe]   ?? VIBE_MAP['royal_luxury'];
  const attireData = ATTIRE_MAP[attire] ?? ATTIRE_MAP['white_thobe_black_bisht'];

  const vibeDesc    = vibeData.description;
  const vibeLighting = vibeData.lighting;
  const vibeMood    = vibeData.mood;
  const attireDesc  = attireData.description;

  // ── LAYER 1: Trigger word — MUST be first token ────────────────────────────
  // Fal.ai FLUX-LoRA: trigger word يجب أن يكون أول token في الـ prompt
  // لضمان أعلى attention weight وأقوى تفعيل لملامح الشخصية المدرّبة.
  const triggerPrefix = loraTriggerWord?.trim()
    ? `${loraTriggerWord.trim()}, `
    : '';

  // ── Bottle reference: Vision description أو اسم بسيط ─────────────────────
  const bottleRef = bottleDescription?.trim()
    ? `The ${perfumeData.name} by ${perfumeData.brand} perfume bottle — ${bottleDescription.trim()} —`
    : `the ${perfumeData.name} by ${perfumeData.brand} perfume bottle`;

  // ── Build prompt from layers ───────────────────────────────────────────────
  const parts: string[] = [
    // 1. Trigger word (أعلى attention)
    triggerPrefix,

    // 2. Subject definition
    '3D CGI photorealistic render of a single confident Arab man in his mid-30s, strong defined masculine facial features, well-groomed short dark beard with clean edges, warm olive skin tone with realistic subsurface scattering,',

    // 3. Attire
    `wearing ${attireDesc},`,

    // 4. Environment
    `${vibeDesc},`,

    // 5. Lighting
    `${vibeLighting},`,

    // 6. Hand-bottle interaction (anatomically precise)
    `He holds ${bottleRef} in his right hand using a natural relaxed power grip: thumb resting flat against the side panel, index through pinky fingers wrapped snugly around the lower two-thirds of the bottle, wrist tilted at 15 degrees toward camera so the front label is fully visible and legible, arm slightly bent at the elbow, bottle held at chest-to-waist height,`,

    // 7. Bottle rendering quality
    'perfectly rendered bottle with accurate glass refractions and transparency, crisp label with all text legible, correct proportions, no label distortion,',

    // 8. Pose & mood
    `character posture is ${vibeMood}, weight shifted to one hip, subtle confident smile, gaze directed at camera,`,

    // 9. Technical quality
    'hyper-realistic Octane render, ultra-detailed surface textures, 8K resolution, cinematic shallow depth of field with focus plane spanning both face and bottle, professional commercial photography lighting, award-winning CGI advertisement, film grain, global illumination, ray-traced reflections.',
  ];

  return parts
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── buildNegativePrompt ──────────────────────────────────────────────────────
// قائمة شاملة بكل أوضاع الفشل المعروفة في توليد الأيدي والزجاجات
// ─────────────────────────────────────────────────────────────────────────────

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
