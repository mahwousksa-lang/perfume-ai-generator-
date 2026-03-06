// ============================================================
// app/api/generate-video/route.ts
// POST /api/generate-video
// Creates 2 video generation tasks with Hedra:
//   1. Vertical (9:16) — for Reels, TikTok, Snapchat, YouTube Shorts
//   2. Horizontal (16:9) — for YouTube, Twitter/X, LinkedIn
// Returns generation IDs for polling.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHedraVideo, type VideoAspectRatio } from '@/lib/hedraClient';
import type { PerfumeData } from '@/lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface VideoGenerationRequest {
  perfumeData: PerfumeData;
  imageUrl: string; // The generated character+perfume image URL
  vibe: string;
}

// ── Generate voiceover text based on perfume data ───────────────────────────

function generateVoiceoverText(perfumeData: PerfumeData, vibe: string): string {
  const name = perfumeData.name || 'هذا العطر';
  const brand = perfumeData.brand || '';
  const notes = perfumeData.notes || '';

  // Create a compelling Arabic voiceover script
  const scripts = [
    `اكتشف ${name}${brand ? ` من ${brand}` : ''}. عطر يجمع بين الفخامة والأصالة${notes ? `، بمكونات ${notes}` : ''}. تجربة استثنائية تليق بذوقك الرفيع. اطلبه الآن من متجر مهووس.`,
    `${name}${brand ? ` من ${brand}` : ''}. ليس مجرد عطر، بل هوية. ${notes ? `مكوناته من ${notes} تمنحك` : 'يمنحك'} حضوراً لا يُنسى. اكتشف الفخامة الحقيقية.`,
    `عندما تبحث عن التميز، ${name} هو خيارك. ${notes ? `بتركيبته الفريدة من ${notes}،` : ''} يأسر كل من حولك. متوفر الآن في متجر مهووس.`,
  ];

  // Pick based on vibe
  if (vibe.includes('oriental') || vibe.includes('majlis') || vibe.includes('palace')) {
    return scripts[0];
  } else if (vibe.includes('modern') || vibe.includes('corporate')) {
    return scripts[1];
  }
  return scripts[2];
}

// ── Generate video prompt based on perfume data ─────────────────────────────

function generateVideoPrompt(perfumeData: PerfumeData, aspectRatio: VideoAspectRatio): string {
  const name = perfumeData.name || 'luxury perfume';
  const orientation = aspectRatio === '9:16' ? 'vertical' : 'horizontal';

  return `A stylish 3D animated character in elegant attire confidently holds and presents a luxury perfume bottle "${name}". The character looks directly at the camera with a warm, inviting expression. Smooth, cinematic camera movement. Premium luxury advertising style. ${orientation} composition. Soft golden lighting. Professional product showcase.`;
}

export async function POST(request: NextRequest) {
  try {
    const { perfumeData, imageUrl, vibe }: VideoGenerationRequest = await request.json();

    if (!perfumeData?.name || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: perfumeData, imageUrl' },
        { status: 400 }
      );
    }

    if (!process.env.HEDRA_API_KEY) {
      return NextResponse.json(
        { error: 'HEDRA_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const voiceoverText = generateVoiceoverText(perfumeData, vibe || '');

    // Launch both video generations in parallel
    const [verticalResult, horizontalResult] = await Promise.allSettled([
      // 1. Vertical (9:16) — Reels, TikTok, Snapchat, YouTube Shorts
      createHedraVideo({
        imageUrl,
        textPrompt: generateVideoPrompt(perfumeData, '9:16'),
        voiceoverText,
        aspectRatio: '9:16',
        durationMs: 10000,
      }),
      // 2. Horizontal (16:9) — YouTube, Twitter, LinkedIn
      createHedraVideo({
        imageUrl,
        textPrompt: generateVideoPrompt(perfumeData, '16:9'),
        voiceoverText,
        aspectRatio: '16:9',
        durationMs: 10000,
      }),
    ]);

    const videos: Array<{
      id: string;
      aspectRatio: VideoAspectRatio;
      status: string;
      error?: string;
    }> = [];

    if (verticalResult.status === 'fulfilled') {
      videos.push({
        id: verticalResult.value.id,
        aspectRatio: '9:16',
        status: verticalResult.value.status,
      });
    } else {
      console.error('[generate-video] Vertical failed:', verticalResult.reason);
      videos.push({
        id: '',
        aspectRatio: '9:16',
        status: 'failed',
        error: verticalResult.reason?.message || 'Vertical video generation failed',
      });
    }

    if (horizontalResult.status === 'fulfilled') {
      videos.push({
        id: horizontalResult.value.id,
        aspectRatio: '16:9',
        status: horizontalResult.value.status,
      });
    } else {
      console.error('[generate-video] Horizontal failed:', horizontalResult.reason);
      videos.push({
        id: '',
        aspectRatio: '16:9',
        status: 'failed',
        error: horizontalResult.reason?.message || 'Horizontal video generation failed',
      });
    }

    return NextResponse.json({
      videos,
      voiceoverText,
    });
  } catch (error: unknown) {
    console.error('[/api/generate-video] Error:', error);
    const message = error instanceof Error ? error.message : 'Video generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
