// app/api/generate/route.ts
// ============================================================
// Mahwous Perfume AI — Image Generation via Google Gemini
// Upgraded from fal.ai FLUX to Gemini 2.5 Flash Image
// Generates 3D animated character (Nano Banana style) holding
// the EXACT perfume bottle from the product image
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { buildGeminiPrompt } from '@/lib/promptEngine';
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ASPECT_CONFIGS = [
  {
    format: 'story',
    label: 'Instagram Story (9:16)',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    aspectHint: 'VERTICAL PORTRAIT (9:16 tall format, taller than wide)',
  },
  {
    format: 'post',
    label: 'Post Square (1:1)',
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: '1:1',
    aspectHint: 'SQUARE (1:1 equal width and height)',
  },
  {
    format: 'landscape',
    label: 'Twitter / LinkedIn (16:9)',
    dimensions: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    aspectHint: 'HORIZONTAL LANDSCAPE (16:9 wide format, wider than tall)',
  },
];

async function generateWithGemini(
  prompt: string,
  bottleImageBase64: string | undefined,
  bottleImageUrl: string | undefined,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.');

  // Build the request parts
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  // Add bottle image if available
  if (bottleImageBase64) {
    // Strip data URL prefix if present
    const base64Data = bottleImageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    });
  } else if (bottleImageUrl) {
    // Fetch the bottle image and convert to base64
    try {
      const res = await fetch(bottleImageUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType: contentType.split(';')[0],
            data: base64,
          },
        });
      }
    } catch {
      console.warn('Could not fetch bottle image, generating without reference');
    }
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

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
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const candidates = data?.candidates;
  if (!candidates || candidates.length === 0) return null;

  for (const part of candidates[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return part.inlineData.data; // base64 image data
    }
  }

  return null;
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

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const { perfumeData, vibe = '', attire = '' } = body;
    const bottleImageBase64 = body.bottleImageBase64;
    const bottleImageUrl = perfumeData.imageUrl;

    // Generate all 3 formats in parallel using Gemini
    const generatePromises = ASPECT_CONFIGS.map(async (ac) => {
      const prompt = buildGeminiPrompt({
        perfumeData,
        vibe,
        attire,
        aspectHint: ac.aspectHint,
        bottleDescription: body.bottleDescription,
      });

      try {
        const imageBase64 = await generateWithGemini(prompt, bottleImageBase64, bottleImageUrl);

        if (!imageBase64) {
          return {
            format: ac.format,
            label: ac.label,
            dimensions: ac.dimensions,
            aspectRatio: ac.aspectRatio,
            url: null,
            status: 'FAILED',
          };
        }

        // Convert base64 to data URL
        const dataUrl = `data:image/png;base64,${imageBase64}`;

        return {
          format: ac.format,
          label: ac.label,
          dimensions: ac.dimensions,
          aspectRatio: ac.aspectRatio,
          url: dataUrl,
          status: 'COMPLETED',
        };
      } catch (err) {
        console.error(`[generate] Error for format ${ac.format}:`, err);
        return {
          format: ac.format,
          label: ac.label,
          dimensions: ac.dimensions,
          aspectRatio: ac.aspectRatio,
          url: null,
          status: 'FAILED',
        };
      }
    });

    const results = await Promise.all(generatePromises);
    const completedImages = results.filter((r) => r.status === 'COMPLETED' && r.url);

    if (completedImages.length === 0) {
      return NextResponse.json(
        { error: 'فشل توليد الصور. يرجى المحاولة مرة أخرى.' },
        { status: 500 }
      );
    }

    // Return completed images directly (no polling needed with Gemini)
    return NextResponse.json({
      status: 'completed',
      images: completedImages.map((img) => ({
        format: img.format,
        label: img.label,
        dimensions: img.dimensions,
        url: img.url,
        aspectRatio: img.aspectRatio,
      })),
      prompt: buildGeminiPrompt({ perfumeData, vibe, attire, aspectHint: '', bottleDescription: body.bottleDescription }),
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
