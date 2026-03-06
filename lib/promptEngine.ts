// @ts-nocheck
// ============================================================
// lib/promptEngine.ts
// Generates hyper-detailed, consistent image prompts.
// ============================================================

import type { GenerateParams, Vibe, Attire } from "./types";

// ─── CHARACTER DEFINITION (Mahwous 3D Mascot) ───────────────────────────────────
const CHARACTER_BASE = `
  (hyper-detailed 3D mascot character, consistent features:1.5), official Mahwous mascot,
  (Pixar/Disney CGI style:1.4), large cartoonish head, big expressive warm brown eyes,
  thick straight black eyebrows, (well-defined full black beard covering chin and cheeks:1.3),
  black hair neatly swept back with a single strand falling onto the forehead,
  (smooth olive skin 3D texture:1.2)
`.trim();

// ─── PERFUME BOTTLE DEFINITION ───────────────────────────────────────────────────
function getBottleDescription(perfumeName: string): string {
  const lower = perfumeName.toLowerCase();
  if (lower.includes("dior joy")) {
    return `
      (perfectly rendered photorealistic Dior JOY Eau de Parfum Intense bottle:1.6),
      (cylindrical transparent glass bottle with a soft pink liquid:1.4),
      (intricate silver threaded cap with a magnetic look:1.5), prominent silver "JOY" text
      with "DIOR" inside the "O", realistic glass reflections and transparency, held delicately.
    `.trim();
  }
  // Add other specific bottle descriptions here...
  return `(a photorealistic perfume bottle representing ${perfumeName}:1.4)`;
}

// ─── SCENE & STYLE DEFINITIONS ────────────────────────────────────────────────────
const VIBE_MAP: Record<Vibe, string> = {
  majlis: `
    (luxurious modern Saudi majlis:1.4), opulent Arabian interior design,
    (ornate geometric patterns, plush carpets, and elegant seating:1.2),
    warm ambient lighting from traditional lanterns, a sense of quiet sophistication.
  `.trim(),
  // Add other vibes here...
};

const ATTIRE_MAP: Record<Attire, string> = {
  saudi_thobe_vest: `
    wearing a crisp white Saudi thobe and a stylish grey vest (sadiri), looking elegant and relaxed.
  `.trim(),
  // Add other attires here...
};

// ─── EFFECTS DEFINITION ──────────────────────────────────────────────────────────
function getEffects(notes: string[]): string {
  if (!notes || notes.length === 0) return "";
  const effects = notes.map(note => `(${note} scent notes flying around:1.2)`).join(", ");
  return `
    (magical scent notes swirling around the character and the bottle:1.3), ${effects},
    (glowing particles and soft smoke effects:1.1)
  `.trim();
}

// ─── QUALITY & RENDER SETTINGS ──────────────────────────────────────────────────
const QUALITY_SETTINGS = `
  (8K, ultra-high-res, photorealistic, masterpiece:1.3), cinematic lighting,
  (global illumination, subsurface scattering, physically-based rendering:1.2),
  Octane render quality, Unreal Engine 5, sharp focus, vibrant colors.
`.trim();

const NEGATIVE_PROMPT = `
  (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy,
  extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4),
  disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation,
  text, watermark, signature, jpeg artifacts, low quality, error, incoherent.
`.trim();

// ─── PROMPT GENERATION ENGINE ───────────────────────────────────────────────────
export function generatePrompt(params: GenerateParams): { prompt: string; negative_prompt: string } {
  const { perfumeName, vibe, attire, notes } = params;

  const bottleDescription = getBottleDescription(perfumeName);
  const vibeDescription = VIBE_MAP[vibe] || VIBE_MAP.majlis;
  const attireDescription = ATTIRE_MAP[attire] || ATTIRE_MAP.saudi_thobe_vest;
  const effectsDescription = getEffects(notes);

  const finalPrompt = [
    CHARACTER_BASE,
    attireDescription,
    `The character is sitting comfortably in a chair, holding up the ${bottleDescription}`,
    `The scene is a ${vibeDescription}`,
    effectsDescription,
    QUALITY_SETTINGS,
  ].join(", ").replace(/\s+/g, " ");

  return {
    prompt: finalPrompt,
    negative_prompt: NEGATIVE_PROMPT,
  };
}
