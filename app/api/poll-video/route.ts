// ============================================================
// app/api/poll-video/route.ts
// POST /api/poll-video
// Polls Hedra for the status of pending video generations.
// Returns video URLs when complete.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHedraVideoStatus, getHedraAsset } from '@/lib/hedraClient';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

interface PollVideoRequest {
  videos: Array<{
    id: string;
    aspectRatio: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { videos }: PollVideoRequest = await request.json();

    if (!videos || !Array.isArray(videos)) {
      return NextResponse.json({ error: 'videos array required' }, { status: 400 });
    }

    if (!process.env.HEDRA_API_KEY) {
      return NextResponse.json({ error: 'HEDRA_API_KEY is not configured.' }, { status: 500 });
    }

    const results = await Promise.all(
      videos.map(async (video) => {
        if (!video.id) {
          return { ...video, status: 'failed', videoUrl: null, error: 'No generation ID' };
        }

        try {
          const status = await getHedraVideoStatus(video.id);

          if (status.status === 'complete' && status.asset_id) {
            // Try to get the asset download URL
            try {
              const asset = await getHedraAsset(status.asset_id);
              const videoUrl = asset.url || asset.download_url || null;
              return {
                ...video,
                status: 'complete',
                videoUrl,
                progress: 100,
              };
            } catch {
              // If asset fetch fails, return the generation status anyway
              return {
                ...video,
                status: 'complete',
                videoUrl: null,
                progress: 100,
                error: 'Asset URL not available yet',
              };
            }
          }

          if (status.status === 'failed') {
            return {
              ...video,
              status: 'failed',
              videoUrl: null,
              error: status.error || 'Video generation failed',
            };
          }

          // Still processing
          return {
            ...video,
            status: status.status,
            videoUrl: null,
            progress: status.progress || 0,
            eta_sec: status.eta_sec,
          };
        } catch (err) {
          console.error(`[poll-video] Error polling ${video.id}:`, err);
          return {
            ...video,
            status: 'error',
            videoUrl: null,
            error: err instanceof Error ? err.message : 'Poll failed',
          };
        }
      })
    );

    const allComplete = results.every(
      (r) => r.status === 'complete' || r.status === 'failed'
    );

    return NextResponse.json({
      results,
      allComplete,
    });
  } catch (error: unknown) {
    console.error('[/api/poll-video] Error:', error);
    const message = error instanceof Error ? error.message : 'Video poll failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
