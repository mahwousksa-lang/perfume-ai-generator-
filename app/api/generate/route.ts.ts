// ============================================================
// app/api/generate/route.ts
// POST /api/generate
//
// Generates 3 promotional images (story · post · landscape)
// using the Fal.ai FLUX-LoRA pipeline.
//
// Expected body:
// {
//   perfumeData:       { name, brand, gender?, notes?, description? }
//   vibe:              string  (key from VIBE_MAP)
//   attire:            string  (key from ATTIRE_MAP)
//   loraPath?:         string  (URL to .safetensors — face consistency)
//   loraTriggerWord?:  string  (injected FIRST in prompt)
//   bottleImageBase64?: string (data:image/... — bottle fidelity)
//   bottleDescription?: string (from /api/analyze-bottle)
// }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateImages } from '@/lib/falClient';
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    // ── Validation ────────────────────────────────────────────────────────────
    if (!body.perfumeData?.name?.trim() || !body.perfumeData?.brand?.trim()) {
      return NextResponse.json(
        { error: 'perfumeData.name and perfumeData.brand are required.' },
        { status: 400 },
      );
    }
    if (!body.vibe?.trim() || !body.attire?.trim()) {
      return NextResponse.json(
        { error: 'vibe and attire are required.' },
        { status: 400 },
      );
    }
    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY is not configured on the server.' },
        { status: 500 },
      );
    }

    // ── Generate ──────────────────────────────────────────────────────────────
    const result = await generateImages(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
