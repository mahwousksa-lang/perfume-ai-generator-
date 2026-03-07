import { NextRequest, NextResponse } from 'next/server';

// ── POST /api/metricool/publish ─────────────────────────────────────────────
// Proxy to Metricool API for scheduling posts
// This runs server-side to keep API tokens secure

const METRICOOL_BASE = 'https://app.metricool.com/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userToken, blogId, post } = body;

    if (!userToken || !blogId) {
      return NextResponse.json(
        { error: 'Missing Metricool credentials (userToken, blogId)' },
        { status: 400 }
      );
    }

    if (!post || !post.providers || post.providers.length === 0) {
      return NextResponse.json(
        { error: 'Missing post data or providers' },
        { status: 400 }
      );
    }

    // Build Metricool schedule request
    const metricoolPayload = {
      blogId: parseInt(blogId),
      providers: post.providers, // e.g., ['INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK']
      text: post.text || '',
      date: post.date || new Date().toISOString(),
      mediaUrls: post.mediaUrls || [],
      autoPublish: post.autoPublish !== false,
      // Platform-specific overrides
      ...(post.instagramOptions && { instagramOptions: post.instagramOptions }),
      ...(post.facebookOptions && { facebookOptions: post.facebookOptions }),
      ...(post.twitterOptions && { twitterOptions: post.twitterOptions }),
      ...(post.tiktokOptions && { tiktokOptions: post.tiktokOptions }),
      ...(post.linkedinOptions && { linkedinOptions: post.linkedinOptions }),
      ...(post.youtubeOptions && { youtubeOptions: post.youtubeOptions }),
      ...(post.pinterestOptions && { pinterestOptions: post.pinterestOptions }),
    };

    const response = await fetch(`${METRICOOL_BASE}/scheduler/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mc-Auth': userToken,
      },
      body: JSON.stringify(metricoolPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Metricool Publish] Error:', response.status, errorText);
      return NextResponse.json(
        { error: `Metricool API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      postId: result.id || result.postId,
      scheduledDate: post.date,
      providers: post.providers,
      message: 'تم جدولة المنشور بنجاح عبر Metricool',
    });
  } catch (error) {
    console.error('[Metricool Publish] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
