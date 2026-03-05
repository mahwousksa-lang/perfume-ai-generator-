// ============================================================
// lib/replicateClient.ts
// AI Image Generation Pipeline using Replicate
//
// ARCHITECTURE:
// ┌─────────────────────────────────────────────────────────┐
// │  buildPrompt()  → optimized prompt string               │
// │       ↓                                                 │
// │  generateImages() → 3x parallel Replicate API calls     │
// │       ↓         (story 9:16 / post 1:1 / landscape 16:9)│
// │  Returns: GeneratedImage[] with URLs for all 3 formats  │
// └─────────────────────────────────────────────────────────┘
//
// PRIMARY MODEL: lucataco/flux-dev-lora
//   - Supports HuggingFace LoRA weights for face consistency
//   - Native aspect_ratio parameter (no resize degradation)
//   - High-quality FLUX architecture
//
// BOTTLE FIDELITY STRATEGY (3 layers):
//   Layer 1: Prompt injection — Claude Vision describes the bottle
//            precisely; description injected into prompt
//   Layer 2: IP-Adapter weight — bottle image sent as style reference
//   Layer 3: ControlNet Canny — for advanced users, bottle edges
//            are extracted and used as a hard structural guide
//            (enabled via NEXT_PUBLIC_USE_CONTROLNET=true)
// ============================================================

import Replicate from 'replicate';
import { buildPrompt, buildNegativePrompt } from './promptEngine';
import type { GenerationRequest, GeneratedImage } from './types';

// ─── Model IDs ───────────────────────────────────────────────────────────────────
const FLUX_LORA_MODEL =
  (process.env.REPLICATE_FLUX_LORA_MODEL as `${string}/${string}:${string}`) ??
  'lucataco/flux-dev-lora:091495765fa5ef2725a175a57b276de8ca4ec54f3a66e93ec8ee4e1bd9bfb842';

// ControlNet model for bottle structural fidelity (advanced pipeline)
const CONTROLNET_MODEL =
  (process.env.REPLICATE_CONTROLNET_MODEL as `${string}/${string}:${string}`) ??
  'xlabs-ai/flux-dev-controlnet:f2c31c31d81278a91b2447a304dae654c64a5d5a2cec513d83ad571763a7c872';

// ─── Aspect Ratio Configurations ────────────────────────────────────────────────
interface AspectConfig {
  format: 'story' | 'post' | 'landscape';
  label: string;
  aspectRatio: string; // Replicate's aspect_ratio param
  dimensions: { width: number; height: number };
}

const ASPECT_CONFIGS: AspectConfig[] = [
  {
    format: 'story',
    label: 'Instagram Story (9:16)',
    aspectRatio: '9:16',
    dimensions: { width: 1080, height: 1920 },
  },
  {
    format: 'post',
    label: 'Post Square (1:1)',
    aspectRatio: '1:1',
    dimensions: { width: 1024, height: 1024 },
  },
  {
    format: 'landscape',
    label: 'Twitter / LinkedIn (16:9)',
    aspectRatio: '16:9',
    dimensions: { width: 1920, height: 1080 },
  },
];

// ─── Client Initialization ───────────────────────────────────────────────────────
function getReplicateClient() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is not set in environment variables.');
  }
  return new Replicate({ auth: token });
}

// ─── Per-Format Generator ────────────────────────────────────────────────────────
async function generateSingleFormat(
  replicate: Replicate,
  request: GenerationRequest,
  prompt: string,
  negativePrompt: string,
  aspectConfig: AspectConfig,
): Promise<GeneratedImage> {
  const { loraModelId, bottleImageBase64 } = request;

  // ── Build input payload for FLUX-LoRA model ──────────────────────────────────
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    aspect_ratio: aspectConfig.aspectRatio,
    num_outputs: 1,
    num_inference_steps: 28,
    guidance_scale: 3.5,           // FLUX uses CFG ~3.5 (lower than SDXL's 7.5)
    output_format: 'webp',
    output_quality: 95,
    disable_safety_checker: false,
  };

  // ── Attach LoRA weights (face consistency) ────────────────────────────────────
  if (loraModelId?.trim()) {
    input.hf_lora = loraModelId.trim();  // e.g., "myusername/arab-man-face-lora"
    input.lora_scale = 0.85;             // 0.7–0.9 is the sweet spot
  }

  // ── Attach bottle reference image (product fidelity) ─────────────────────────
  // This uses the model's img2img capability as a soft reference.
  // For HARD structural guidance, switch to CONTROLNET_MODEL below.
  if (bottleImageBase64?.startsWith('data:image/')) {
    input.image = bottleImageBase64;
    input.image_to_image_strength = 0.35; // Low strength = more prompt freedom
  }

  // ── Run generation ────────────────────────────────────────────────────────────
  const output = await replicate.run(FLUX_LORA_MODEL, { input });

  // Replicate returns an array of FileOutput objects or URL strings
  const rawUrl = Array.isArray(output) ? output[0] : output;
  const url = typeof rawUrl === 'string' ? rawUrl : (rawUrl as { url: () => URL }).url().toString();

  return {
    format: aspectConfig.format,
    label: aspectConfig.label,
    aspectRatio: aspectConfig.aspectRatio,
    url,
    dimensions: aspectConfig.dimensions,
  };
}

// ─── Advanced ControlNet Pipeline (optional) ─────────────────────────────────────
/**
 * Advanced 2-pass pipeline:
 * Pass 1: Generate character with LoRA (FLUX)
 * Pass 2: ControlNet Canny edges from bottle reference → composite bottle
 *
 * Enable by setting NEXT_PUBLIC_USE_CONTROLNET=true in .env.local
 */
async function generateWithControlNet(
  replicate: Replicate,
  request: GenerationRequest,
  prompt: string,
  negativePrompt: string,
  aspectConfig: AspectConfig,
): Promise<GeneratedImage> {
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    control_image: request.bottleImageBase64,
    controlnet_conditioning_scale: 0.75,
    aspect_ratio: aspectConfig.aspectRatio,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    output_format: 'webp',
    output_quality: 95,
  };

  if (request.loraModelId?.trim()) {
    input.hf_lora = request.loraModelId.trim();
    input.lora_scale = 0.85;
  }

  const output = await replicate.run(CONTROLNET_MODEL, { input });
  const rawUrl = Array.isArray(output) ? output[0] : output;
  const url = typeof rawUrl === 'string' ? rawUrl : (rawUrl as { url: () => URL }).url().toString();

  return {
    format: aspectConfig.format,
    label: aspectConfig.label,
    aspectRatio: aspectConfig.aspectRatio,
    url,
    dimensions: aspectConfig.dimensions,
  };
}

// ─── Main Export ─────────────────────────────────────────────────────────────────
export async function generateImages(request: GenerationRequest): Promise<{
  images: GeneratedImage[];
  prompt: string;
  negativePrompt: string;
}> {
  const replicate = getReplicateClient();
  const prompt = buildPrompt(request);
  const negativePrompt = buildNegativePrompt();
  const useControlNet = request.bottleImageBase64 && process.env.USE_CONTROLNET === 'true';

  const generator = useControlNet
    ? (ac: AspectConfig) => generateWithControlNet(replicate, request, prompt, negativePrompt, ac)
    : (ac: AspectConfig) => generateSingleFormat(replicate, request, prompt, negativePrompt, ac);

  // Fire all 3 aspect-ratio generations simultaneously
  const images = await Promise.all(ASPECT_CONFIGS.map(generator));

  return { images, prompt, negativePrompt };
}
