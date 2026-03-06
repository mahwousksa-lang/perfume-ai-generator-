// ============================================================
// lib/promptEngine.ts  — Mahwous Perfume AI Campaign Generator
// ============================================================
// @ts-nocheck

import type { GenerationRequest } from './types';

// ─── MAHWOUS CHARACTER (ثابت في كل صورة) ────────────────────────────────────
const CHARACTER_BASE = `3D Pixar Disney CGI animated character, the official Mahwous mascot, large rounded cartoon head with smooth olive skin, thick straight black eyebrows, big warm expressive brown eyes, neat full black beard covering chin and cheeks, black hair neatly swept back, crisp white Saudi thobe with a stylish grey vest sadiri waistcoat, sitting relaxed and confident in a luxurious golden armchair`;

// ─── BOTTLE DESCRIPTIONS ─────────────────────────────────────────────────────
function getBottleDescription(name: string, brand: string): string {
  const lower = (name + ' ' + brand).toLowerCase();

  if ((lower.includes('joy') && lower.includes('dior')) || lower.includes('ديور جوي')) {
    return `holding up a PHOTOREALISTIC Dior JOY Eau de Parfum Intense bottle, cylindrical transparent glass bottle filled with deep pink liquid, body has sculpted diamond-cut faceted geometric patterns, tall cylindrical silver ribbed knurled cap, large 3D silver letters JOY on front with DIOR inscribed inside the O, text EAU DE PARFUM INTENSE below, realistic glass reflections and light refractions`;
  }

  if (lower.includes('good girl') || lower.includes('carolina herrera')) {
    return `holding up a PHOTOREALISTIC Carolina Herrera Good Girl perfume bottle, iconic stiletto high-heel shaped bottle in deep burgundy red glass, black butterfly-shaped cap on top, gold metallic base forming the heel, GOOD GIRL text in gold on the front, realistic glass and metal reflections`;
  }

  if (lower.includes('bvlgari') || lower.includes('bulgari') || lower.includes('بولغاري')) {
    return `holding up a PHOTOREALISTIC Bvlgari perfume bottle, sleek modern glass bottle with silver metallic accents, BVLGARI logo engraved on the front, premium luxury packaging with clean geometric lines, realistic glass transparency and reflections`;
  }

  if (lower.includes('oud') || lower.includes('عود') || lower.includes('bois')) {
    return `holding up a PHOTOREALISTIC luxury oud perfume bottle, ornate dark amber glass bottle with golden Arabic calligraphy, heavy crystal-cut base, golden metallic cap with intricate engravings, warm amber liquid visible through the glass, premium Middle Eastern luxury packaging`;
  }

  if (lower.includes('chanel') || lower.includes('شانيل')) {
    return `holding up a PHOTOREALISTIC Chanel perfume bottle, iconic rectangular clear glass bottle with black cap, CHANEL logo in black letters on front, minimalist elegant design, realistic glass reflections`;
  }

  if (lower.includes('versace') || lower.includes('فيرساتشي')) {
    return `holding up a PHOTOREALISTIC Versace perfume bottle, bold gold and black design, Medusa head emblem on the cap, luxurious metallic finish, realistic reflections`;
  }

  // Generic high-quality bottle
  const bottleName = `${brand} ${name}`.trim();
  return `holding up a PHOTOREALISTIC ${bottleName} perfume bottle, elegant premium glass bottle with clear label showing the brand name "${brand}" and product name "${name}", luxury packaging with realistic glass reflections and light play`;
}

// ─── SCENE / BACKGROUND ──────────────────────────────────────────────────────
function getSceneDescription(notes?: string | string[]): string {
  // Support both string and string[] for notes
  const notesList: string[] = Array.isArray(notes)
    ? notes
    : typeof notes === 'string' && notes.trim()
    ? notes.split(/[,،•\n]+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const hasFloral = notesList.some(n => /rose|jasmine|floral|flower|ورد|ياسمين|زهر/i.test(n));
  const hasOud = notesList.some(n => /oud|wood|sandalwood|عود|خشب|صندل/i.test(n));
  const hasOcean = notesList.some(n => /ocean|sea|marine|aqua|بحر|مائي/i.test(n));
  const hasCitrus = notesList.some(n => /citrus|lemon|bergamot|حمضيات|ليمون|برغموت/i.test(n));

  if (hasFloral) {
    return `luxurious marble palace room with tall arched windows, deep emerald green velvet curtains, pink roses and white flowers visible through the window, warm golden sunset light streaming in, golden Arabic coffee pot dallah and small white coffee cups on a side table`;
  }

  if (hasOud) {
    return `opulent Arabian royal palace interior, dark wood paneling with golden geometric Islamic patterns, warm amber lighting from ornate brass lanterns, rich Persian carpets, incense smoke rising gently, golden Arabic coffee pot dallah on a side table`;
  }

  if (hasOcean) {
    return `modern luxury penthouse with floor-to-ceiling ocean view windows, crystal blue sea visible in the background, white marble interior with silver accents, cool blue ambient lighting, fresh coastal atmosphere`;
  }

  // Default: elegant Saudi majlis
  return `luxurious marble palace room with tall arched windows, deep emerald green velvet curtains, pink roses and white flowers visible through the window, warm golden sunset light streaming in, golden Arabic coffee pot dallah and small white coffee cups on a side table`;
}

// ─── FLOATING SCENT EFFECTS ───────────────────────────────────────────────────
function getScentEffects(notes?: string | string[]): string {
  // Support both string and string[] for notes
  const notesList: string[] = Array.isArray(notes)
    ? notes
    : typeof notes === 'string' && notes.trim()
    ? notes.split(/[,،•\n]+/).map((s) => s.trim()).filter(Boolean)
    : [];
  if (!notesList || notesList.length === 0) {
    return `soft golden sparkles and pink smoke wisps swirling magically around the character`;
  }

  const effects: string[] = [];
  for (const note of notesList.slice(0, 5)) {
    const n = note.toLowerCase();
    if (/rose|ورد/.test(n)) effects.push('floating pink rose petals');
    else if (/jasmine|ياسمين/.test(n)) effects.push('floating white jasmine flowers');
    else if (/lemon|citrus|ليمون|حمضيات/.test(n)) effects.push('floating lemon slices');
    else if (/oud|عود/.test(n)) effects.push('floating oud wood chips');
    else if (/sandalwood|صندل/.test(n)) effects.push('floating sandalwood pieces');
    else if (/vanilla|فانيليا/.test(n)) effects.push('floating vanilla pods');
    else if (/musk|مسك/.test(n)) effects.push('soft white musk particles');
    else if (/bergamot|برغموت/.test(n)) effects.push('floating bergamot slices');
    else effects.push(`floating ${note} particles`);
  }

  return `${effects.join(', ')}, soft pink and golden smoke wisps swirling magically, golden sparkles`;
}

// ─── MAIN PROMPT BUILDER ──────────────────────────────────────────────────────
export function buildPrompt(request: GenerationRequest): string {
  const { perfumeData, vibe = '', attire = '' } = request;
  const { name = '', brand = '', notes } = perfumeData || {};

  const bottleDesc = getBottleDescription(name, brand);
  const sceneDesc = getSceneDescription(notes);
  const scentEffects = getScentEffects(notes);

  // Trigger word first (for LoRA consistency)
  const triggerWord = (process.env.NEXT_PUBLIC_DEFAULT_LORA_TRIGGER || '').trim();

  const parts = [
    triggerWord,
    CHARACTER_BASE,
    bottleDesc,
    `Background: ${sceneDesc}`,
    `Floating around: ${scentEffects}`,
    `Ultra-realistic 8K 3D render, Octane Render, cinematic lighting, masterpiece, award-winning commercial photography quality, sharp focus, vibrant colors, global illumination, subsurface scattering`,
  ].filter(Boolean);

  return parts.join(', ').replace(/\s+/g, ' ').trim();
}

// ─── NEGATIVE PROMPT ──────────────────────────────────────────────────────────
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

// ─── Legacy export for backward compatibility ─────────────────────────────────
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
