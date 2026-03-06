import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt } from '@/lib/promptEngine';
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const FAL_BASE = 'https://queue.fal.run';
const FAL_MODEL = 'fal-ai/flux-lora';
const LORA_PATH = 'https://v3b.fal.media/files/b/0a90eba7/OiQI7NS6N3neTl50fJHcC_pytorch_lora_weights.safetensors';

const ASPECT_CONFIGS = [
  { format: 'story',     label: 'Instagram Story (9:16)',    imageSize: { width: 1080, height: 1920 }, dimensions: { width: 1080, height: 1920 } },
  { format: 'post',      label: 'Post Square (1:1)',          imageSize: { width: 1080, height: 1080 }, dimensions: { width: 1080, height: 1080 } },
  { format: 'landscape', label: 'Twitter / LinkedIn (16:9)', imageSize: { width: 1280, height: 720  }, dimensions: { width: 1280, height: 720  } },
];

function getAuthHeader(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not set in environment variables.');
  return `Key ${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    if (!body.perfumeData?.name?.trim() || !body.perfumeData?.brand?.trim()) {
      return NextResponse.json(
        { error: 'perfumeData.name and perfumeData.brand are required.' },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(body);
    const loraPath = body.loraPath?.trim() || LORA_PATH;

    // Submit all 3 formats to fal.ai queue simultaneously and return request IDs immediately
    // This avoids Vercel's 60s timeout by doing polling on the client side
    const submitPromises = ASPECT_CONFIGS.map(async (ac) => {
      const input: Record<string, unknown> = {
        prompt,
        image_size: ac.imageSize,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'jpeg',
        loras: [{ path: loraPath, scale: 1.0 }],
      };

      const res = await fetch(`${FAL_BASE}/${FAL_MODEL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
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

      return {
        format: ac.format,
        label: ac.label,
        dimensions: ac.dimensions,
        requestId,
        model: FAL_MODEL,
      };
    });

    const pendingImages = await Promise.all(submitPromises);

    return NextResponse.json({
      status: 'pending',
      pendingImages,
      prompt,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
