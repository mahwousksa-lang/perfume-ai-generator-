import { NextRequest, NextResponse } from 'next/server';

// ── POST /api/metricool/analytics ───────────────────────────────────────────
// Proxy to Metricool API for fetching analytics data

const METRICOOL_BASE = 'https://app.metricool.com/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userToken, blogId, endpoint, params } = body;

    if (!userToken || !blogId) {
      return NextResponse.json(
        { error: 'Missing Metricool credentials' },
        { status: 400 }
      );
    }

    // Supported endpoints
    const allowedEndpoints = [
      'stats/posts',
      'stats/community',
      'stats/reels',
      'stats/stories',
      'stats/tiktok',
      'stats/facebook',
      'stats/twitter',
      'stats/linkedin',
      'stats/youtube',
      'stats/pinterest',
      'stats/summary',
      'competitors/list',
      'competitors/posts',
      'scheduler/list',
      'scheduler/besttime',
    ];

    if (!endpoint || !allowedEndpoints.some(e => endpoint.startsWith(e))) {
      return NextResponse.json(
        { error: 'Invalid or unsupported endpoint' },
        { status: 400 }
      );
    }

    // Build URL with query params
    const url = new URL(`${METRICOOL_BASE}/${endpoint}`);
    url.searchParams.set('blogId', blogId);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Mc-Auth': userToken,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Metricool Analytics] Error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Metricool API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data,
      endpoint,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Metricool Analytics] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
