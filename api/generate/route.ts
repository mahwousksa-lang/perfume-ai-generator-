// ============================================================
// app/api/generate/route.ts
// POST /api/generate
// Generates 3 promotional images (story, post, landscape) for
// the perfume brand campaign using the Replicate AI pipeline.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateImages } from '@/lib/replicateClient';
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 120; // Vercel max function duration (seconds)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    // ── Validation ───────────────────────────────────────────────────────────────
    if (!body.perfumeData?.name || !body.perfumeData?.brand) {
      return NextResponse.json(
        { error: 'perfumeData.name and perfumeData.brand are required.' },
        { status: 400 },
      );
    }
    if (!body.vibe || !body.attire) {
      return NextResponse.json(
        { error: 'vibe and attire are required.' },
        { status: 400 },
      );
    }

    // ── Generate ─────────────────────────────────────────────────────────────────
    const result = await generateImages(body);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('[/api/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
