// ============================================================
// app/api/generate/route.ts
// Mahwous Perfume AI — Hybrid Image Generation Pipeline
//
// PIPELINE (2-Step):
//   Step 1: FLUX LoRA (fal-ai/flux-lora)
//     → Uses trained MAHWOUS_MAN LoRA for stable character face
//     → LoRA: https://v3b.fal.media/files/b/0a90eba7/OiQI7NS6N3neTl50fJHcC_pytorch_lora_weights.safetensors
//     → Trigger word: MAHWOUS_MAN
//
//   Step 2: Gemini 2.5 Flash Image (Nano Banana style)
//     → Takes FLUX output as reference image
//     → Enhances to Pixar/Disney 3D quality with Nano Banana style
//     → Ensures bottle accuracy and cinematic lighting
//
// FALLBACK: If FLUX fails → Gemini only
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { buildFluxPrompt, buildNegativePrompt, buildGeminiEnhancePrompt } from '@/lib/promptEngine';
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── MAHWOUS_MAN LoRA weights (trained on fal.ai) ────────────────────────────
const MAHWOUS_LORA_URL =
  'https://v3b.fal.media/files/b/0a90eba7/OiQI7NS6N3neTl50fJHcC_pytorch_lora_weights.safetensors';
const MAHWOUS_TRIGGER = 'MAHWOUS_MAN';

const FAL_BASE = 'https://queue.fal.run';
const FAL_MODEL = 'fal-ai/flux-lora';

// ─── Aspect ratio configurations ─────────────────────────────────────────────
const ASPECT_CONFIGS = [
  {
    format: 'story' as const,
    label: 'Instagram Story (9:16)',
    dimensions: { width: 864, height: 1536 },
    imageSize: { width: 864, height: 1536 },
    aspectRatio: '9:16',
    aspectHint: 'VERTICAL PORTRAIT (9:16 tall format, taller than wide)',
  },
  {
    format: 'post' as const,
    label: 'Post Square (1:1)',
    dimensions: { width: 1072, height: 1072 },
    imageSize: { width: 1072, height: 1072 },
    aspectRatio: '1:1',
    aspectHint: 'SQUARE (1:1 equal width and height)',
  },
  {
    format: 'landscape' as const,
    label: 'Twitter / LinkedIn (16:9)',
    dimensions: { width: 1280, height: 720 },
    imageSize: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    aspectHint: 'HORIZONTAL LANDSCAPE (16:9 wide format, wider than tall)',
  },
];

// ─── Step 1A: Submit to fal.ai queue ─────────────────────────────────────────
async function submitToFal(input: Record<string, unknown>): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY is not set.');

  const res = await fetch(`${FAL_BASE}/${FAL_MODEL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`fal.ai submit error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const requestId = data?.request_id as string | undefined;
  if (!requestId) throw new Error('fal.ai did not return a request_id');
  return requestId;
}

// ─── Step 1B: Poll fal.ai until done ─────────────────────────────────────────
async function pollFalUntilDone(requestId: string, timeoutMs = 120_000): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY is not set.');

  const statusUrl = `${FAL_BASE}/${FAL_MODEL}/requests/${requestId}/status`;
  const resultUrl = `${FAL_BASE}/${FAL_MODEL}/requests/${requestId}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (!statusRes.ok) continue;

    const status = await statusRes.json();
    const queueStatus: string = status?.status ?? '';

    if (queueStatus === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!resultRes.ok) throw new Error(`fal.ai result fetch error ${resultRes.status}`);
      const result = await resultRes.json();
      const imageUrl: string | undefined = result?.images?.[0]?.url ?? result?.image?.url;
      if (!imageUrl) throw new Error('fal.ai returned no image URL');
      return imageUrl;
    }

    if (queueStatus === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${status?.error ?? 'Unknown error'}`);
    }
  }

  throw new Error('fal.ai generation timed out after 120 seconds');
}

// ─── Step 1: Generate with FLUX LoRA (MAHWOUS_MAN character stability) ───────
async function generateWithFluxLora(
  prompt: string,
  negativePrompt: string,
  loraPath: string,
  imageSize: { width: number; height: number },
): Promise<string> {
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    image_size: imageSize,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: false,
    output_format: 'jpeg',
    loras: [{ path: loraPath.trim(), scale: 1.0 }],
  };

  const requestId = await submitToFal(input);
  return await pollFalUntilDone(requestId);
}

// ─── Step 2: Enhance with Gemini Nano Banana style ───────────────────────────
async function enhanceWithGemini(
  fluxImageUrl: string,
  enhancePrompt: string,
  bottleImageBase64?: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn('[generate] GOOGLE_GENERATIVE_AI_API_KEY not set — skipping Gemini enhancement');
    return null;
  }

  // Fetch the FLUX image and convert to base64
  let fluxBase64: string;
  let fluxMimeType: string;
  try {
    const res = await fetch(fluxImageUrl);
    if (!res.ok) throw new Error(`Failed to fetch FLUX image: ${res.status}`);
    const buffer = await res.arrayBuffer();
    fluxBase64 = Buffer.from(buffer).toString('base64');
    fluxMimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  } catch (err) {
    console.warn('[generate] Could not fetch FLUX image for Gemini enhancement:', err);
    return null;
  }

  // Build parts: prompt + FLUX image (character reference) + optional bottle reference
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: enhancePrompt },
    { inlineData: { mimeType: fluxMimeType, data: fluxBase64 } },
  ];

  // Add bottle reference image if available
  if (bottleImageBase64) {
    const base64Data = bottleImageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Data },
    });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[generate] Gemini enhancement error ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json();
    for (const part of data?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return part.inlineData.data; // base64 image
      }
    }
    return null;
  } catch (err) {
    console.warn('[generate] Gemini enhancement failed:', err);
    return null;
  }
}

// ─── Gemini-only fallback ─────────────────────────────────────────────────────
async function generateWithGeminiOnly(
  prompt: string,
  bottleImageBase64?: string,
  bottleImageUrl?: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (bottleImageBase64) {
    const base64Data = bottleImageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
  } else if (bottleImageUrl) {
    try {
      const res = await fetch(bottleImageUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
        parts.push({ inlineData: { mimeType: contentType, data: base64 } });
      }
    } catch { /* ignore */ }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    for (const part of data?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) return part.inlineData.data;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Generate a single format (FLUX LoRA → Gemini enhance) ───────────────────
async function generateFormat(
  request: GenerationRequest,
  ac: typeof ASPECT_CONFIGS[0],
): Promise<{
  format: string;
  label: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  url: string | null;
  status: 'COMPLETED' | 'FAILED';
  pipeline: string;
}> {
  const { bottleImageBase64, perfumeData, vibe = '', attire = '', bottleDescription } = request;

  // Use user-provided LoRA or default to MAHWOUS_MAN trained LoRA
  const loraPath = request.loraPath?.trim() || MAHWOUS_LORA_URL;
  const triggerWord = request.loraTriggerWord?.trim() || MAHWOUS_TRIGGER;

  // Build FLUX prompt (trigger word injected FIRST for maximum LoRA activation)
  const fluxPrompt = buildFluxPrompt({
    perfumeData,
    vibe,
    attire,
    aspectHint: ac.aspectHint,
    bottleDescription,
    loraTriggerWord: triggerWord,
  });
  const negativePrompt = buildNegativePrompt();

  // Build Gemini enhancement prompt
  const geminiPrompt = buildGeminiEnhancePrompt({
    perfumeData,
    vibe,
    attire,
    aspectHint: ac.aspectHint,
    bottleDescription,
  });

  let finalUrl: string | null = null;
  let pipeline = 'none';

  // ── Step 1: FLUX LoRA (character stability) ──────────────────────────────────
  if (process.env.FAL_KEY) {
    try {
      console.log(`[generate] FLUX LoRA (${ac.format}) → trigger: ${triggerWord}`);
      const fluxUrl = await generateWithFluxLora(
        fluxPrompt,
        negativePrompt,
        loraPath,
        ac.imageSize,
      );
      pipeline = 'flux_lora';
      console.log(`[generate] FLUX done (${ac.format}): ${fluxUrl}`);

      // ── Step 2: Gemini enhancement (Nano Banana style) ──────────────────────
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.log(`[generate] Gemini enhance (${ac.format})`);
        const geminiBase64 = await enhanceWithGemini(fluxUrl, geminiPrompt, bottleImageBase64);
        if (geminiBase64) {
          finalUrl = `data:image/png;base64,${geminiBase64}`;
          pipeline = 'flux_lora+gemini';
        } else {
          // Gemini failed — use FLUX result directly
          finalUrl = fluxUrl;
          pipeline = 'flux_lora_only';
        }
      } else {
        finalUrl = fluxUrl;
        pipeline = 'flux_lora_only';
      }
    } catch (err) {
      console.warn(`[generate] FLUX LoRA failed (${ac.format}):`, err);
      // Fall through to Gemini-only fallback
    }
  }

  // ── Fallback: Gemini only (if no FAL_KEY or FLUX failed) ────────────────────
  if (!finalUrl && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log(`[generate] Gemini only fallback (${ac.format})`);
    const geminiBase64 = await generateWithGeminiOnly(
      geminiPrompt,
      bottleImageBase64,
      perfumeData.imageUrl,
    );
    if (geminiBase64) {
      finalUrl = `data:image/png;base64,${geminiBase64}`;
      pipeline = 'gemini_only';
    }
  }

  return {
    format: ac.format,
    label: ac.label,
    dimensions: ac.dimensions,
    aspectRatio: ac.aspectRatio,
    url: finalUrl,
    status: finalUrl ? 'COMPLETED' : 'FAILED',
    pipeline,
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    if (!body.perfumeData?.name?.trim() || !body.perfumeData?.brand?.trim()) {
      return NextResponse.json(
        { error: 'perfumeData.name and perfumeData.brand are required.' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'Neither GOOGLE_GENERATIVE_AI_API_KEY nor FAL_KEY is configured.' },
        { status: 500 }
      );
    }

    // Generate all 3 formats in parallel
    const results = await Promise.all(
      ASPECT_CONFIGS.map((ac) => generateFormat(body, ac))
    );

    const completedImages = results.filter((r) => r.status === 'COMPLETED' && r.url);

    if (completedImages.length === 0) {
      return NextResponse.json(
        { error: 'فشل توليد الصور. يرجى التحقق من مفاتيح API والمحاولة مرة أخرى.' },
        { status: 500 }
      );
    }

    const pipelines = results.map((r) => `${r.format}:${r.pipeline}`).join(', ');
    console.log(`[generate] Pipelines: ${pipelines}`);

    return NextResponse.json({
      status: 'completed',
      images: completedImages.map((img) => ({
        format: img.format,
        label: img.label,
        dimensions: img.dimensions,
        url: img.url,
        aspectRatio: img.aspectRatio,
      })),
      pipeline: results[0]?.pipeline ?? 'unknown',
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
