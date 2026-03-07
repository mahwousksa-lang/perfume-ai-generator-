import { NextRequest, NextResponse } from 'next/server';

// ── POST /api/metricool/smart-publish ───────────────────────────────────────
// Smart publishing: optimizes content per platform then schedules via Metricool
// This is the "3-click" workflow endpoint

const METRICOOL_BASE = 'https://app.metricool.com/api';

// Platform-specific content formatting
function formatForPlatform(
  platform: string,
  caption: string,
  hashtags: string[],
  productUrl: string,
  perfumeName: string
): string {
  const hashtagStr = hashtags.join(' ');

  switch (platform) {
    case 'INSTAGRAM':
      return `${caption}\n\n.\n.\n.\n${hashtagStr}\n\n🔗 الرابط في البايو`;

    case 'FACEBOOK':
      return `${caption}\n\n🛒 اطلبه الآن: ${productUrl}\n\n${hashtags.slice(0, 5).join(' ')}`;

    case 'TWITTER':
      // Twitter has 280 char limit
      const tweetCaption = caption.length > 200
        ? caption.substring(0, 197) + '...'
        : caption;
      return `${tweetCaption}\n\n${productUrl}\n${hashtags.slice(0, 3).join(' ')}`;

    case 'TIKTOK':
      return `${caption}\n\n${hashtags.slice(0, 5).join(' ')}\n#fyp #viral`;

    case 'LINKEDIN':
      return `${caption}\n\n---\n🔗 ${productUrl}\n\n${hashtags.slice(0, 5).join(' ')}`;

    case 'YOUTUBE':
      return `${perfumeName} | مهووس ستور\n\n${caption}\n\n🛒 اطلبه: ${productUrl}\n\n${hashtagStr}`;

    case 'PINTEREST':
      return `${caption}\n\n${hashtagStr}`;

    default:
      return `${caption}\n\n${hashtagStr}`;
  }
}

// Get optimal posting time for platform
function getOptimalTime(platform: string, bestTimes?: Record<string, string>): string {
  const defaults: Record<string, number> = {
    INSTAGRAM: 21,
    FACEBOOK: 19,
    TWITTER: 12,
    TIKTOK: 22,
    LINKEDIN: 8,
    YOUTUBE: 17,
    PINTEREST: 21,
  };

  if (bestTimes && bestTimes[platform.toLowerCase()]) {
    return bestTimes[platform.toLowerCase()];
  }

  const hour = defaults[platform] || 20;
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(hour, 0, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userToken,
      blogId,
      perfumeName,
      perfumeBrand,
      productUrl,
      captions,
      imageUrls,
      videoUrls,
      hashtags,
      platforms,
      bestTimes,
      autoSchedule,
    } = body;

    if (!userToken || !blogId) {
      return NextResponse.json(
        { error: 'Missing Metricool credentials' },
        { status: 400 }
      );
    }

    const targetPlatforms = platforms || ['INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK'];
    const results: Array<{
      platform: string;
      success: boolean;
      postId?: string;
      scheduledTime?: string;
      error?: string;
    }> = [];

    // Schedule a post for each platform with optimized content
    for (const platform of targetPlatforms) {
      try {
        const platformKey = platform.toLowerCase();
        const caption = captions?.[platformKey] || captions?.instagram || '';
        const platformHashtags = hashtags || [
          '#عطور', '#مهووس_ستور', '#perfume', '#fragrance',
          `#${perfumeBrand?.replace(/\s+/g, '_') || 'luxury'}`,
        ];

        const formattedText = formatForPlatform(
          platform, caption, platformHashtags, productUrl || '', perfumeName || ''
        );

        // Select appropriate media
        let mediaUrls: string[] = [];
        if (platform === 'TIKTOK' || platform === 'YOUTUBE') {
          // Prefer video for these platforms
          if (videoUrls?.vertical) mediaUrls = [videoUrls.vertical];
          else if (videoUrls?.horizontal) mediaUrls = [videoUrls.horizontal];
          else if (imageUrls?.story) mediaUrls = [imageUrls.story];
        } else if (platform === 'INSTAGRAM') {
          // Instagram: story format preferred
          if (imageUrls?.story) mediaUrls = [imageUrls.story];
          else if (imageUrls?.post) mediaUrls = [imageUrls.post];
        } else {
          // Other platforms: post format
          if (imageUrls?.post) mediaUrls = [imageUrls.post];
          else if (imageUrls?.landscape) mediaUrls = [imageUrls.landscape];
          else if (imageUrls?.story) mediaUrls = [imageUrls.story];
        }

        const scheduledTime = autoSchedule
          ? getOptimalTime(platform, bestTimes)
          : new Date().toISOString();

        const metricoolPayload = {
          blogId: parseInt(blogId),
          providers: [platform],
          text: formattedText,
          date: scheduledTime,
          mediaUrls,
          autoPublish: true,
        };

        const response = await fetch(`${METRICOOL_BASE}/scheduler/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': userToken,
          },
          body: JSON.stringify(metricoolPayload),
        });

        if (response.ok) {
          const result = await response.json();
          results.push({
            platform,
            success: true,
            postId: result.id || result.postId,
            scheduledTime,
          });
        } else {
          const errorText = await response.text();
          results.push({
            platform,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
          });
        }
      } catch (platformError) {
        results.push({
          platform,
          success: false,
          error: platformError instanceof Error ? platformError.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `تم جدولة ${successCount} منشور بنجاح${failCount > 0 ? ` (${failCount} فشل)` : ''}`,
      results,
      totalScheduled: successCount,
      totalFailed: failCount,
    });
  } catch (error) {
    console.error('[Smart Publish] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
