// ============================================================
// app/api/generate-video/route.ts
// POST /api/generate-video
// Creates a video generation task with Hedra.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHedraVideo } from '@/lib/hedraClient';
import type { GeneratedImage } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface VideoGenerationRequest {
  image: GeneratedImage;
  scenario: string;
  voiceover: string;
}

export async function POST(request: NextRequest) {
  try {
    const { image, scenario, voiceover }: VideoGenerationRequest = await request.json();

    if (!image || !scenario || !voiceover) {
      return NextResponse.json({ error: 'Missing required fields: image, scenario, voiceover' }, { status: 400 });
    }

    const hedraResponse = await createHedraVideo({
      image: image,
      prompt: scenario,
      voice: voiceover,
    });

    return NextResponse.json({ videoId: hedraResponse.id }, { status: 202 }); // Accepted

  } catch (error: unknown) {
    console.error('[/api/generate-video] Error:', error);
    const message = error instanceof Error ? error.message : 'Video generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
