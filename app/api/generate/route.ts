// ============================================================
// app/api/generate/route.ts
// Mahwous Perfume AI — Hybrid Image Generation Pipeline v4
//
// KEY FIX: Product bottle reference image is now used correctly:
//   - FLUX img2img strength lowered to 0.35 (preserves bottle shape)
//   - Gemini receives bottle image FIRST (highest priority)
//   - Prompts heavily emphasize exact bottle reproduction
//
// PIPELINE (3-Step):
//   Step 1: Upload product image to fal.ai storage (if provided)
//   Step 2: FLUX LoRA Image-to-Image (fal-ai/flux-lora/image-to-image)
//     → Uses MAHWOUS_MAN LoRA for stable character face
//     → Uses product image as reference (image_url) with LOW strength
//     → strength: 0.35 (PRESERVES bottle shape from reference)
//   Step 3: Gemini 2.5 Flash Image (Nano Banana style)
//     → Receives bottle image FIRST (priority) + FLUX output second
//     → Strict instructions to reproduce bottle IDENTICALLY
//
// FALLBACK: If FLUX fails → Gemini only (with product image reference)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { buildFluxPrompt, buildNegativePrompt, buildGeminiEnhancePrompt } from '@/lib/promptEngine';
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── MAHWOUS_MAN LoRA weights ─────────────────────────────────────────────────
const MAHWOUS_LORA_URL =
  'https://v3b.fal.media/files/b/0a90eba7/OiQI7NS6N3neTl50fJHcC_pytorch_lora_weights.safetensors';
const MAHWOUS_TRIGGER = 'MAHWOUS_MAN';

const FAL_KEY_ENV = () => process.env.FAL_KEY ?? '';
const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_MODEL_IMG2IMG = 'fal-ai/flux-lora/image-to-image';
const FAL_MODEL_T2I = 'fal-ai/flux-lora';
const FAL_STORAGE_URL = 'https://rest.fal.run/storage/upload/initiate';

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

// ─── Upload image to fal.ai storage ──────────────────────────────────────────
async function uploadImageToFal(imageBase64: string): Promise<string | null> {
  const falKey = FAL_KEY_ENV();
  if (!falKey) return null;

  try {
    // Strip data URI prefix and detect mime type
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    // Initiate upload
    const initiateRes = await fetch(FAL_STORAGE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: mimeType,
        file_size: buffer.length,
      }),
    });

    if (!initiateRes.ok) {
      console.warn('[upload] fal.ai initiate upload failed:', initiateRes.status);
      return null;
    }

    const { upload_url, file_url } = await initiateRes.json();

    // Upload the file
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer,
    });

    if (!uploadRes.ok) {
      console.warn('[upload] fal.ai PUT upload failed:', uploadRes.status);
      return null;
    }

    console.log('[upload] fal.ai image uploaded:', file_url);
    return file_url as string;
  } catch (err) {
    console.warn('[upload] fal.ai upload error:', err);
    return null;
  }
}

// ─── Fetch image URL and convert to base64 ───────────────────────────────────
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    return { base64: Buffer.from(buffer).toString('base64'), mimeType };
  } catch {
    return null;
  }
}

// ─── Submit to fal.ai queue ───────────────────────────────────────────────────
async function submitToFal(model: string, input: Record<string, unknown>): Promise<string> {
  const falKey = FAL_KEY_ENV();
  if (!falKey) throw new Error('FAL_KEY is not set.');

  const res = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
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

// ─── Poll fal.ai until done ───────────────────────────────────────────────────
async function pollFalUntilDone(model: string, requestId: string, timeoutMs = 120_000): Promise<string> {
  const falKey = FAL_KEY_ENV();
  if (!falKey) throw new Error('FAL_KEY is not set.');

  const statusUrl = `${FAL_QUEUE_BASE}/${model}/requests/${requestId}/status`;
  const resultUrl = `${FAL_QUEUE_BASE}/${model}/requests/${requestId}`;
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

// ─── Step 1: FLUX LoRA (with product image as reference) ─────────────────────
async function generateWithFluxLora(params: {
  prompt: string;
  negativePrompt: string;
  loraPath: string;
  imageSize: { width: number; height: number };
  productImageUrl: string | null;   // fal.ai hosted URL of product bottle
}): Promise<string> {
  const { prompt, negativePrompt, loraPath, imageSize, productImageUrl } = params;

  const model = productImageUrl ? FAL_MODEL_IMG2IMG : FAL_MODEL_T2I;

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

  // Add image reference for img2img mode
  // CRITICAL: strength 0.35 = 65% of the original image is PRESERVED
  // This means the bottle shape from the reference photo stays mostly intact
  // while FLUX adds the MAHWOUS_MAN character around it
  if (productImageUrl) {
    input.image_url = productImageUrl;
    input.strength = 0.35;
  }

  const requestId = await submitToFal(model, input);
  return await pollFalUntilDone(model, requestId);
}

// ─── Step 2: Gemini Nano Banana Enhancement ───────────────────────────────────
async function enhanceWithGemini(params: {
  fluxImageUrl: string;
  enhancePrompt: string;
  bottleImageBase64?: string;       // user-provided bottle base64
  bottleImageUrl?: string;          // product image URL for additional reference
}): Promise<string | null> {
  const { fluxImageUrl, enhancePrompt, bottleImageBase64, bottleImageUrl } = params;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  // Fetch FLUX result image
  const fluxImg = await fetchImageAsBase64(fluxImageUrl);
  if (!fluxImg) {
    console.warn('[gemini] Could not fetch FLUX image');
    return null;
  }

  // Build parts: BOTTLE REFERENCE FIRST (highest priority), then FLUX image, then prompt
  // Order matters! Gemini gives more attention to earlier images
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // FIRST: Add bottle reference image (HIGHEST PRIORITY — must be first)
  let hasBottleRef = false;
  if (bottleImageBase64) {
    const base64Data = bottleImageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
    hasBottleRef = true;
  } else if (bottleImageUrl) {
    const bottleImg = await fetchImageAsBase64(bottleImageUrl);
    if (bottleImg) {
      parts.push({ inlineData: { mimeType: bottleImg.mimeType, data: bottleImg.base64 } });
      hasBottleRef = true;
    }
  }

  // SECOND: Add FLUX output (character reference)
  parts.push({ inlineData: { mimeType: fluxImg.mimeType, data: fluxImg.base64 } });

  // THIRD: Add the text prompt
  parts.push({ text: enhancePrompt });

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

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[gemini] Enhancement error ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json();
    for (const part of data?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) return part.inlineData.data;
    }
    return null;
  } catch (err) {
    console.warn('[gemini] Enhancement failed:', err);
    return null;
  }
}

// ─── Gemini-only fallback ─────────────────────────────────────────────────────
async function generateWithGeminiOnly(params: {
  prompt: string;
  bottleImageBase64?: string;
  bottleImageUrl?: string;
}): Promise<string | null> {
  const { prompt, bottleImageBase64, bottleImageUrl } = params;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  // BOTTLE IMAGE FIRST (highest priority), then prompt
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (bottleImageBase64) {
    const base64Data = bottleImageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
  } else if (bottleImageUrl) {
    const bottleImg = await fetchImageAsBase64(bottleImageUrl);
    if (bottleImg) {
      parts.push({ inlineData: { mimeType: bottleImg.mimeType, data: bottleImg.base64 } });
    }
  }

  parts.push({ text: prompt });

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

// ─── Generate a single format ─────────────────────────────────────────────────
async function generateFormat(
  request: GenerationRequest,
  ac: typeof ASPECT_CONFIGS[0],
  productFalUrl: string | null,     // fal.ai hosted product image URL
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
  const loraPath = request.loraPath?.trim() || MAHWOUS_LORA_URL;
  const triggerWord = request.loraTriggerWord?.trim() || MAHWOUS_TRIGGER;

  const hasUserBottle = !!(bottleImageBase64);
  const hasAnyBottleRef = !!(bottleImageBase64 || productFalUrl || perfumeData.imageUrl);

  const fluxPrompt = buildFluxPrompt({
    perfumeData,
    vibe,
    attire,
    aspectHint: ac.aspectHint,
    bottleDescription,
    loraTriggerWord: triggerWord,
    hasBottleReference: hasUserBottle,
  });
  const negativePrompt = buildNegativePrompt();

  const geminiPrompt = buildGeminiEnhancePrompt({
    perfumeData,
    vibe,
    attire,
    aspectHint: ac.aspectHint,
    bottleDescription,
    hasBottleReference: hasAnyBottleRef,
  });

  let finalUrl: string | null = null;
  let pipeline = 'none';

  // ── Step 1: FLUX LoRA (character + bottle reference) ─────────────────────────
  if (FAL_KEY_ENV()) {
    try {
      console.log(`[generate] FLUX LoRA (${ac.format}) productRef: ${productFalUrl ? 'yes' : 'no'}`);
      const fluxUrl = await generateWithFluxLora({
        prompt: fluxPrompt,
        negativePrompt,
        loraPath,
        imageSize: ac.imageSize,
        productImageUrl: productFalUrl,
      });
      pipeline = productFalUrl ? 'flux_lora_img2img' : 'flux_lora_t2i';
      console.log(`[generate] FLUX done (${ac.format}): ${fluxUrl}`);

      // ── Step 2: Gemini enhancement (Nano Banana + bottle reference) ───────────
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.log(`[generate] Gemini enhance (${ac.format})`);
        const geminiBase64 = await enhanceWithGemini({
          fluxImageUrl: fluxUrl,
          enhancePrompt: geminiPrompt,
          bottleImageBase64,
          bottleImageUrl: perfumeData.imageUrl,
        });
        if (geminiBase64) {
          finalUrl = `data:image/png;base64,${geminiBase64}`;
          pipeline = productFalUrl ? 'flux_lora_img2img+gemini' : 'flux_lora_t2i+gemini';
        } else {
          finalUrl = fluxUrl;
          pipeline += '_only';
        }
      } else {
        finalUrl = fluxUrl;
        pipeline += '_only';
      }
    } catch (err) {
      console.warn(`[generate] FLUX LoRA failed (${ac.format}):`, err);
    }
  }

  // ── Fallback: Gemini only ─────────────────────────────────────────────────────
  if (!finalUrl && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log(`[generate] Gemini only fallback (${ac.format})`);
    const geminiBase64 = await generateWithGeminiOnly({
      prompt: geminiPrompt,
      bottleImageBase64,
      bottleImageUrl: perfumeData.imageUrl,
    });
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

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !FAL_KEY_ENV()) {
      return NextResponse.json(
        { error: 'Neither GOOGLE_GENERATIVE_AI_API_KEY nor FAL_KEY is configured.' },
        { status: 500 }
      );
    }

    // ── Upload product image to fal.ai storage (once, reused for all 3 formats) ─
    let productFalUrl: string | null = null;
    if (FAL_KEY_ENV()) {
      // Priority: user-provided base64 > product imageUrl
      if (body.bottleImageBase64) {
        console.log('[generate] Uploading user-provided bottle image to fal.ai...');
        productFalUrl = await uploadImageToFal(body.bottleImageBase64);
      } else if (body.perfumeData?.imageUrl) {
        console.log('[generate] Fetching product image URL and uploading to fal.ai...');
        const imgData = await fetchImageAsBase64(body.perfumeData.imageUrl);
        if (imgData) {
          const dataUri = `data:${imgData.mimeType};base64,${imgData.base64}`;
          productFalUrl = await uploadImageToFal(dataUri);
        }
      }
      console.log('[generate] Product fal.ai URL:', productFalUrl ?? 'none (text-to-image mode)');
    }

    // Generate all 3 formats in parallel
    const results = await Promise.all(
      ASPECT_CONFIGS.map((ac) => generateFormat(body, ac, productFalUrl))
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
