// ============================================================
// app/api/generate-video/route.ts  — v5 (OPTIMIZED)
//
// OPTIMIZED FLOW:
//   1. Upload image ONCE → shared image_asset_id
//   2. Generate TTS ONCE → shared audio_asset_id (wait for complete)
//   3. Generate 2 videos in PARALLEL using same audio_id + image_id
//   4. Return generation IDs for client-side polling
//
// This avoids duplicate TTS + upload and stays within 120s timeout.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  uploadImageToHedra,
  generateSharedAudio,
  createHedraVideoWithAssets,
  type VideoAspectRatio,
} from '@/lib/hedraClient';
import type { PerfumeData } from '@/lib/types';

export const maxDuration = 120; // upload (10s) + TTS (30s) + 2x video init (10s each)
export const dynamic = 'force-dynamic';

interface VideoGenerationRequest {
  perfumeData: PerfumeData;
  imageUrl: string;
  vibe: string;
}

function generateVoiceoverText(perfumeData: PerfumeData, vibe: string): string {
  const name = perfumeData.name || 'هذا العطر';
  const brand = perfumeData.brand || '';
  const notes = perfumeData.notes || '';

  const scripts = [
    `اكتشف ${name}${brand ? ` من ${brand}` : ''}. عطر يجمع بين الفخامة والأصالة${notes ? `، بمكونات ${notes}` : ''}. تجربة استثنائية تليق بذوقك الرفيع. اطلبه الآن من متجر مهووس.`,
    `${name}${brand ? ` من ${brand}` : ''}. ليس مجرد عطر، بل هوية. ${notes ? `مكوناته من ${notes} تمنحك` : 'يمنحك'} حضوراً لا يُنسى. اكتشف الفخامة الحقيقية.`,
    `عندما تبحث عن التميز، ${name} هو خيارك. ${notes ? `بتركيبته الفريدة من ${notes}،` : ''} يأسر كل من حولك. متوفر الآن في متجر مهووس.`,
  ];

  if (vibe.includes('oriental') || vibe.includes('majlis') || vibe.includes('palace')) {
    return scripts[0];
  } else if (vibe.includes('modern') || vibe.includes('corporate')) {
    return scripts[1];
  }
  return scripts[2];
}

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

    // ── Step 1: Upload image ONCE ─────────────────────────────────────────
    console.log('[generate-video] Step 1: Uploading image...');
    const imageAssetId = await uploadImageToHedra(imageUrl);

    // ── Step 2: Generate TTS ONCE and wait for completion ─────────────────
    console.log('[generate-video] Step 2: Generating TTS audio...');
    const audioAssetId = await generateSharedAudio(voiceoverText);

    // ── Step 3: Launch both videos in parallel with shared assets ─────────
    console.log('[generate-video] Step 3: Launching 2 videos in parallel...');
    const [verticalResult, horizontalResult] = await Promise.allSettled([
      createHedraVideoWithAssets({
        imageAssetId,
        audioAssetId,
        textPrompt: generateVideoPrompt(perfumeData, '9:16'),
        aspectRatio: '9:16',
      }),
      createHedraVideoWithAssets({
        imageAssetId,
        audioAssetId,
        textPrompt: generateVideoPrompt(perfumeData, '16:9'),
        aspectRatio: '16:9',
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
        status: verticalResult.value.status || 'queued',
      });
    } else {
      console.error('[generate-video] Vertical failed:', verticalResult.reason);
      videos.push({
        id: '',
        aspectRatio: '9:16',
        status: 'failed',
        error: String(verticalResult.reason?.message || 'Vertical video generation failed'),
      });
    }

    if (horizontalResult.status === 'fulfilled') {
      videos.push({
        id: horizontalResult.value.id,
        aspectRatio: '16:9',
        status: horizontalResult.value.status || 'queued',
      });
    } else {
      console.error('[generate-video] Horizontal failed:', horizontalResult.reason);
      videos.push({
        id: '',
        aspectRatio: '16:9',
        status: 'failed',
        error: String(horizontalResult.reason?.message || 'Horizontal video generation failed'),
      });
    }

    return NextResponse.json({ videos, voiceoverText });
  } catch (error: unknown) {
    console.error('[/api/generate-video] Error:', error);
    const message = error instanceof Error ? error.message : 'Video generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
