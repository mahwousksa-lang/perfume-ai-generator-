import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/metricool/smart-publish — النشر الذكي عبر Metricool V2 API
// يولّد محتوى مخصص لكل منصة ثم يجدول عبر Metricool
// هذا هو المحرك الوحيد للنشر — بدون Make.com
// ══════════════════════════════════════════════════════════════════════════════

const METRICOOL_V2_BASE = 'https://app.metricool.com/api/v2';
const METRICOOL_V1_BASE = 'https://app.metricool.com/api';

// ── عبارات هوية مهووس ────────────────────────────────────────────────────────
const MAHWOUS_SIGNATURES = [
  '✨ مهووس ستور — نهتم بالتفاصيل',
  '👑 مهووس ستور — ذوقك يستاهل الأفضل',
  '🌹 مهووس ستور — عطرك يحكي قصتك',
  '💎 مهووس ستور — الفخامة في كل قطرة',
  '🔥 مهووس ستور — عطور تسحر الحواس',
];

function getRandomSignature(): string {
  return MAHWOUS_SIGNATURES[Math.floor(Math.random() * MAHWOUS_SIGNATURES.length)];
}

// ── تنسيق المحتوى لكل منصة ──────────────────────────────────────────────────
function formatForPlatform(
  platform: string,
  caption: string,
  hashtags: string[],
  productUrl: string,
  perfumeName: string,
  perfumeBrand: string
): string {
  const signature = getRandomSignature();
  const hashtagStr = hashtags.join(' ');

  switch (platform) {
    case 'instagram':
      return [
        caption,
        '',
        signature,
        '',
        '.',
        '.',
        '.',
        hashtagStr,
        '',
        '🔗 الرابط في البايو',
      ].join('\n');

    case 'facebook':
      return [
        caption,
        '',
        `🛒 اطلبه الآن: ${productUrl}`,
        '',
        signature,
        '',
        hashtags.slice(0, 5).join(' '),
      ].join('\n');

    case 'twitter': {
      // Twitter: 280 حرف كحد أقصى
      const maxLen = 200 - productUrl.length - 10;
      const tweetCaption = caption.length > maxLen
        ? caption.substring(0, maxLen - 3) + '...'
        : caption;
      return [
        tweetCaption,
        '',
        productUrl,
        hashtags.slice(0, 3).join(' '),
      ].join('\n');
    }

    case 'tiktok':
      return [
        caption,
        '',
        hashtags.slice(0, 5).join(' '),
        '#fyp #viral #PerfumeTok #عطور_تيك_توك',
      ].join('\n');

    case 'linkedin':
      return [
        caption,
        '',
        '---',
        `🔗 ${productUrl}`,
        '',
        signature,
        '',
        hashtags.slice(0, 5).join(' '),
      ].join('\n');

    case 'youtube':
      return [
        `${perfumeName} | ${perfumeBrand} | مهووس ستور`,
        '',
        caption,
        '',
        `🛒 اطلبه: ${productUrl}`,
        '',
        signature,
        '',
        hashtagStr,
      ].join('\n');

    case 'pinterest':
      return [
        `${perfumeName} — ${perfumeBrand}`,
        '',
        caption,
        '',
        hashtagStr,
      ].join('\n');

    case 'google_business':
      return [
        caption,
        '',
        `🛒 ${productUrl}`,
        '',
        signature,
      ].join('\n');

    default:
      return `${caption}\n\n${signature}\n\n${hashtagStr}`;
  }
}

// ── أوقات النشر المثالية (توقيت السعودية) ────────────────────────────────────
function getOptimalDateTime(platform: string, bestTimes?: Record<string, string>): {
  dateTime: string;
  timezone: string;
} {
  const defaults: Record<string, number> = {
    instagram: 21,   // 9 مساءً — ذروة التفاعل
    facebook: 19,    // 7 مساءً
    twitter: 12,     // 12 ظهراً
    tiktok: 22,      // 10 مساءً
    linkedin: 8,     // 8 صباحاً — وقت العمل
    youtube: 17,     // 5 عصراً
    pinterest: 21,   // 9 مساءً
    google_business: 10, // 10 صباحاً
  };

  // Use learned best times if available
  if (bestTimes && bestTimes[platform]) {
    const [hours, minutes] = bestTimes[platform].split(':').map(Number);
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes || 0, 0, 0);
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    return {
      dateTime: scheduled.toISOString().replace('Z', '').split('.')[0],
      timezone: 'Asia/Riyadh',
    };
  }

  const hour = defaults[platform] || 20;
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(hour, 0, 0, 0);

  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return {
    dateTime: scheduled.toISOString().replace('Z', '').split('.')[0],
    timezone: 'Asia/Riyadh',
  };
}

// ── رفع الوسائط إلى Metricool ────────────────────────────────────────────────
async function normalizeMedia(
  mediaUrl: string,
  userToken: string,
  blogId: string
): Promise<string> {
  if (!mediaUrl || mediaUrl.startsWith('data:')) return '';

  try {
    const res = await fetch(
      `${METRICOOL_V1_BASE}/actions/normalize/image/url?url=${encodeURIComponent(mediaUrl)}&blogId=${blogId}`,
      {
        headers: { 'X-Mc-Auth': userToken },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.url || data || mediaUrl;
    }
    return mediaUrl;
  } catch {
    return mediaUrl;
  }
}

// ── اختيار الوسائط المناسبة لكل منصة ────────────────────────────────────────
function selectMediaForPlatform(
  platform: string,
  imageUrls: Record<string, string>,
  videoUrls: Record<string, string>
): string[] {
  switch (platform) {
    case 'instagram':
      // Instagram: صورة ستوري أو بوست
      return [imageUrls.story || imageUrls.post || ''].filter(Boolean);

    case 'tiktok':
    case 'youtube':
      // TikTok/YouTube: فيديو عمودي أولاً
      if (videoUrls.vertical) return [videoUrls.vertical];
      if (videoUrls.horizontal) return [videoUrls.horizontal];
      return [imageUrls.story || imageUrls.post || ''].filter(Boolean);

    case 'facebook':
    case 'linkedin':
      // Facebook/LinkedIn: صورة بوست أو عرضية
      return [imageUrls.post || imageUrls.landscape || imageUrls.story || ''].filter(Boolean);

    case 'twitter':
      // Twitter: صورة بوست
      return [imageUrls.post || imageUrls.landscape || ''].filter(Boolean);

    case 'pinterest':
      // Pinterest: صورة عمودية عالية الجودة
      return [imageUrls.story || imageUrls.post || ''].filter(Boolean);

    case 'google_business':
      return [imageUrls.post || imageUrls.landscape || ''].filter(Boolean);

    default:
      return [imageUrls.post || imageUrls.story || ''].filter(Boolean);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST Handler — النشر الذكي
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userToken,
      blogId,
      userId,
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
        { error: 'أدخل بيانات Metricool أولاً من تاب مركز الذكاء' },
        { status: 400 }
      );
    }

    // المنصات المدعومة من Metricool
    const METRICOOL_PLATFORMS = ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'youtube', 'pinterest', 'google_business'];

    const targetPlatforms = (platforms || ['instagram', 'facebook', 'twitter', 'tiktok'])
      .map((p: string) => p.toLowerCase())
      .filter((p: string) => METRICOOL_PLATFORMS.includes(p));

    if (targetPlatforms.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد منصات مدعومة من Metricool في القائمة' },
        { status: 400 }
      );
    }

    const results: Array<{
      platform: string;
      success: boolean;
      postId?: string;
      scheduledTime?: string;
      error?: string;
    }> = [];

    // ── جدولة منشور لكل منصة بمحتوى مخصص ──────────────────────────────
    for (const platform of targetPlatforms) {
      try {
        // 1. اختيار الكابشن المناسب
        const captionKey = platform === 'instagram' ? 'instagram_post'
          : platform === 'facebook' ? 'facebook_post'
          : platform === 'twitter' ? 'twitter'
          : platform === 'tiktok' ? 'tiktok'
          : platform === 'linkedin' ? 'linkedin'
          : platform === 'youtube' ? 'youtube_thumbnail'
          : platform === 'pinterest' ? 'pinterest'
          : 'instagram_post';

        const rawCaption = captions?.[captionKey] || captions?.[platform] || captions?.instagram_post || captions?.instagram || '';

        // 2. تنسيق الهاشتاقات
        const platformHashtags = hashtags || [
          '#عطور', '#مهووس_ستور', '#عطور_أصلية', '#perfume', '#fragrance',
          '#السعودية', '#luxury', '#عطر',
          `#${(perfumeBrand || 'luxury').replace(/\s+/g, '_')}`,
          `#${(perfumeName || 'عطر').replace(/\s+/g, '_')}`,
        ];

        // 3. تنسيق النص لكل منصة
        const formattedText = formatForPlatform(
          platform, rawCaption, platformHashtags,
          productUrl || '', perfumeName || '', perfumeBrand || ''
        );

        // 4. اختيار الوسائط المناسبة
        const selectedMedia = selectMediaForPlatform(
          platform, imageUrls || {}, videoUrls || {}
        );

        // 5. رفع الوسائط إلى Metricool
        const normalizedMedia: string[] = [];
        for (const mediaUrl of selectedMedia) {
          if (mediaUrl) {
            const normalized = await normalizeMedia(mediaUrl, userToken, blogId);
            if (normalized) normalizedMedia.push(normalized);
          }
        }

        // 6. تحديد وقت النشر
        const { dateTime, timezone } = autoSchedule !== false
          ? getOptimalDateTime(platform, bestTimes)
          : { dateTime: new Date(Date.now() + 2 * 60000).toISOString().replace('Z', '').split('.')[0], timezone: 'Asia/Riyadh' };

        // 7. بناء payload V2 API
        const scheduledPost = {
          publicationDate: {
            dateTime,
            timezone,
          },
          text: formattedText,
          providers: [{ network: platform }],
          media: normalizedMedia,
          autoPublish: true,
          saveExternalMediaFiles: true,
          shortener: false,
          draft: false,
          // بيانات خاصة بكل منصة
          ...(platform === 'facebook' && {
            facebookData: { type: 'POST' },
          }),
          ...(platform === 'instagram' && {
            instagramData: {
              autoPublish: true,
              showReelsInFeed: true,
            },
          }),
          ...(platform === 'tiktok' && {
            tiktokData: {},
          }),
          ...(platform === 'youtube' && {
            youtubeData: {},
          }),
          ...(platform === 'linkedin' && {
            linkedinData: {},
          }),
          ...(platform === 'pinterest' && {
            pinterestData: {},
          }),
        };

        // 8. إرسال إلى Metricool V2 API
        const url = `${METRICOOL_V2_BASE}/scheduler/posts?blogId=${blogId}${userId ? `&userId=${userId}` : ''}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': userToken,
          },
          body: JSON.stringify(scheduledPost),
        });

        if (response.ok) {
          const result = await response.json();
          results.push({
            platform,
            success: true,
            postId: result.id || result.postId || 'scheduled',
            scheduledTime: dateTime,
          });
        } else {
          const errorText = await response.text();
          console.error(`[Smart Publish] ${platform} error:`, response.status, errorText);
          results.push({
            platform,
            success: false,
            error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
          });
        }

        // تأخير بسيط بين الطلبات
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (platformError) {
        results.push({
          platform,
          success: false,
          error: platformError instanceof Error ? platformError.message : 'خطأ غير معروف',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: successCount > 0
        ? `تم جدولة ${successCount} منشور بنجاح على ${results.filter(r => r.success).map(r => r.platform).join(', ')}${failCount > 0 ? ` (${failCount} فشل)` : ''}`
        : 'فشل النشر على جميع المنصات — تحقق من إعدادات Metricool',
      results,
      totalScheduled: successCount,
      totalFailed: failCount,
    });
  } catch (error) {
    console.error('[Smart Publish] Server error:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
