import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/metricool/smart-publish — النشر الذكي عبر Metricool API
// V3: تشخيص أخطاء مفصل + إصلاح صيغة الوسائط + دعم الفيديو
// ══════════════════════════════════════════════════════════════════════════════

const METRICOOL_V2_BASE = 'https://app.metricool.com/api/v2';
const METRICOOL_V1_BASE = 'https://app.metricool.com/api';

// ── جلب بيانات Metricool من البيئة ──────────────────────────────────────────
function getServerCredentials() {
  return {
    token: process.env.METRICOOL_API_TOKEN || '',
    blogId: process.env.METRICOOL_BLOG_ID || '',
    userId: process.env.METRICOOL_USER_ID || '',
  };
}

// ── جلب blogId تلقائياً ──────────────────────────────────────────────────────
async function ensureBlogId(token: string, blogId: string): Promise<{ blogId: string; userId: string; connectedNetworks: string[] }> {
  if (blogId) return { blogId, userId: '', connectedNetworks: [] };

  try {
    const res = await fetch(`${METRICOOL_V1_BASE}/admin/simpleProfiles`, {
      headers: { 'X-Mc-Auth': token },
    });

    if (res.ok) {
      const profiles = await res.json();
      console.log('[Smart Publish] simpleProfiles response:', JSON.stringify(profiles).substring(0, 500));

      if (Array.isArray(profiles) && profiles.length > 0) {
        const p = profiles[0];
        return {
          blogId: String(p.id || p.blogId || ''),
          userId: String(p.userId || p.user_id || ''),
          connectedNetworks: p.networks || p.connectedNetworks || [],
        };
      }
      if (profiles && typeof profiles === 'object' && !Array.isArray(profiles)) {
        return {
          blogId: String(profiles.id || profiles.blogId || ''),
          userId: String(profiles.userId || profiles.user_id || ''),
          connectedNetworks: profiles.networks || profiles.connectedNetworks || [],
        };
      }
    } else {
      const errText = await res.text();
      console.error('[Smart Publish] simpleProfiles failed:', res.status, errText);
    }
  } catch (e) {
    console.error('[Smart Publish] Failed to fetch blogId:', e);
  }

  return { blogId: '', userId: '', connectedNetworks: [] };
}

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
      return [caption, '', signature, '', '.', '.', '.', hashtagStr, '', '🔗 الرابط في البايو'].join('\n');
    case 'facebook':
      return [caption, '', `🛒 اطلبه الآن: ${productUrl}`, '', signature, '', hashtags.slice(0, 5).join(' ')].join('\n');
    case 'twitter': {
      const maxLen = 200 - productUrl.length - 10;
      const tweetCaption = caption.length > maxLen ? caption.substring(0, maxLen - 3) + '...' : caption;
      return [tweetCaption, '', productUrl, hashtags.slice(0, 3).join(' ')].join('\n');
    }
    case 'tiktok':
      return [caption, '', hashtags.slice(0, 5).join(' '), '#fyp #viral #PerfumeTok #عطور_تيك_توك'].join('\n');
    case 'linkedin':
      return [caption, '', '---', `🔗 ${productUrl}`, '', signature, '', hashtags.slice(0, 5).join(' ')].join('\n');
    case 'youtube':
      return [`${perfumeName} | ${perfumeBrand} | مهووس ستور`, '', caption, '', `🛒 اطلبه: ${productUrl}`, '', signature, '', hashtagStr].join('\n');
    case 'pinterest':
      return [`${perfumeName} — ${perfumeBrand}`, '', caption, '', hashtagStr].join('\n');
    case 'google_business':
      return [caption, '', `🛒 ${productUrl}`, '', signature].join('\n');
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
    instagram: 21, facebook: 19, twitter: 12, tiktok: 22,
    linkedin: 8, youtube: 17, pinterest: 21, google_business: 10,
  };

  const hour = (bestTimes && bestTimes[platform])
    ? parseInt(bestTimes[platform].split(':')[0], 10)
    : (defaults[platform] || 20);

  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(hour, 0, 0, 0);
  if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);

  return {
    dateTime: scheduled.toISOString().replace('Z', '').split('.')[0],
    timezone: 'Asia/Riyadh',
  };
}

// ── رفع الوسائط إلى Metricool ────────────────────────────────────────────────
async function uploadMediaToMetricool(
  mediaUrl: string,
  token: string,
  blogId: string
): Promise<string> {
  if (!mediaUrl || mediaUrl.startsWith('data:')) return '';

  try {
    // Method 1: normalize/image/url
    const normalizeUrl = `${METRICOOL_V1_BASE}/actions/normalize/image/url?url=${encodeURIComponent(mediaUrl)}&blogId=${blogId}`;
    console.log(`[Smart Publish] Normalizing media: ${mediaUrl.substring(0, 80)}...`);

    const res = await fetch(normalizeUrl, {
      headers: { 'X-Mc-Auth': token },
    });

    if (res.ok) {
      const data = await res.json();
      const normalizedUrl = typeof data === 'string' ? data : (data.url || data.normalizedUrl || '');
      if (normalizedUrl) {
        console.log(`[Smart Publish] Media normalized: ${normalizedUrl.substring(0, 80)}...`);
        return normalizedUrl;
      }
    }

    console.warn(`[Smart Publish] Normalize failed (${res.status}), using original URL`);
    // Fallback: use original URL directly (Metricool may accept public URLs)
    return mediaUrl;
  } catch (e) {
    console.warn('[Smart Publish] Media upload error, using original URL:', e);
    return mediaUrl;
  }
}

// ── اختيار الوسائط المناسبة لكل منصة ────────────────────────────────────────
function selectMediaForPlatform(
  platform: string,
  imageUrls: Record<string, string>,
  videoUrls: Record<string, string>
): { urls: string[]; isVideo: boolean } {
  // المنصات التي تفضل الفيديو
  const videoFirst = ['tiktok', 'youtube', 'instagram'];

  if (videoFirst.includes(platform)) {
    if (platform === 'youtube' && videoUrls.horizontal) {
      return { urls: [videoUrls.horizontal], isVideo: true };
    }
    if (videoUrls.vertical) {
      return { urls: [videoUrls.vertical], isVideo: true };
    }
  }

  // Fallback to images
  switch (platform) {
    case 'instagram':
      return { urls: [imageUrls.story || imageUrls.post || ''].filter(Boolean), isVideo: false };
    case 'tiktok':
      return { urls: [imageUrls.story || imageUrls.post || ''].filter(Boolean), isVideo: false };
    case 'youtube':
      return { urls: [imageUrls.landscape || imageUrls.post || ''].filter(Boolean), isVideo: false };
    case 'facebook':
    case 'linkedin':
      return { urls: [imageUrls.post || imageUrls.landscape || ''].filter(Boolean), isVideo: false };
    case 'twitter':
      return { urls: [imageUrls.post || imageUrls.landscape || ''].filter(Boolean), isVideo: false };
    case 'pinterest':
      return { urls: [imageUrls.story || imageUrls.post || ''].filter(Boolean), isVideo: false };
    case 'google_business':
      return { urls: [imageUrls.post || imageUrls.landscape || ''].filter(Boolean), isVideo: false };
    default:
      return { urls: [imageUrls.post || imageUrls.story || ''].filter(Boolean), isVideo: false };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST Handler — النشر الذكي V3
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const diagnostics: string[] = [];

  try {
    const body = await req.json();
    const {
      perfumeName, perfumeBrand, productUrl,
      captions, imageUrls, videoUrls, hashtags,
      platforms, bestTimes, autoSchedule,
    } = body;

    diagnostics.push('Request received');

    // ── جلب Token من البيئة ──────────────────────────────────────────
    const serverCreds = getServerCredentials();

    if (!serverCreds.token) {
      return NextResponse.json({
        error: 'METRICOOL_API_TOKEN غير موجود — أضفه في Vercel Environment Variables',
        diagnostics,
      }, { status: 400 });
    }

    diagnostics.push(`Token found (length: ${serverCreds.token.length})`);

    // ── جلب blogId تلقائياً ──────────────────────────────────────────
    const { blogId, userId, connectedNetworks } = await ensureBlogId(
      serverCreds.token, serverCreds.blogId
    );

    diagnostics.push(`blogId: ${blogId || 'NOT FOUND'}`);
    diagnostics.push(`userId: ${userId || 'NOT FOUND'}`);
    diagnostics.push(`connectedNetworks: ${JSON.stringify(connectedNetworks)}`);

    if (!blogId) {
      return NextResponse.json({
        error: 'لم نتمكن من جلب blogId — تأكد من صحة Token أو أضف METRICOOL_BLOG_ID في Vercel',
        diagnostics,
      }, { status: 400 });
    }

    const finalUserId = serverCreds.userId || userId;

    // المنصات المدعومة
    const METRICOOL_PLATFORMS = ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'youtube', 'pinterest', 'google_business'];

    const targetPlatforms = (platforms || ['instagram', 'facebook', 'twitter', 'tiktok'])
      .map((p: string) => p.toLowerCase())
      .filter((p: string) => METRICOOL_PLATFORMS.includes(p));

    if (targetPlatforms.length === 0) {
      return NextResponse.json({
        error: 'لا توجد منصات مدعومة',
        diagnostics,
      }, { status: 400 });
    }

    diagnostics.push(`Target platforms: ${targetPlatforms.join(', ')}`);

    const results: Array<{
      platform: string;
      success: boolean;
      postId?: string;
      scheduledTime?: string;
      error?: string;
      debug?: string;
    }> = [];

    // ── جدولة منشور لكل منصة ──────────────────────────────────────────
    for (const platform of targetPlatforms) {
      try {
        // 1. اختيار الكابشن
        const captionKey = platform === 'instagram' ? 'instagram_post'
          : platform === 'facebook' ? 'facebook_post'
          : platform === 'twitter' ? 'twitter'
          : platform === 'tiktok' ? 'tiktok'
          : platform === 'linkedin' ? 'linkedin'
          : platform === 'youtube' ? 'youtube_thumbnail'
          : platform === 'pinterest' ? 'pinterest'
          : 'instagram_post';

        const rawCaption = captions?.[captionKey] || captions?.[platform] || captions?.instagram_post || captions?.instagram || `عطر ${perfumeName} من ${perfumeBrand} — اكتشف الفخامة مع مهووس ستور`;

        const platformHashtags = hashtags || [
          '#عطور', '#مهووس_ستور', '#عطور_أصلية', '#perfume', '#fragrance',
          '#السعودية', '#luxury', '#عطر',
        ];

        // 2. تنسيق النص
        const formattedText = formatForPlatform(
          platform, rawCaption, platformHashtags,
          productUrl || '', perfumeName || '', perfumeBrand || ''
        );

        // 3. اختيار وتحميل الوسائط
        const selectedMedia = selectMediaForPlatform(platform, imageUrls || {}, videoUrls || {});
        const normalizedMedia: string[] = [];

        for (const mediaUrl of selectedMedia.urls) {
          if (mediaUrl) {
            const normalized = await uploadMediaToMetricool(mediaUrl, serverCreds.token, blogId);
            if (normalized) normalizedMedia.push(normalized);
          }
        }

        diagnostics.push(`${platform}: media=${normalizedMedia.length}, isVideo=${selectedMedia.isVideo}`);

        // 4. تحديد وقت النشر
        const { dateTime, timezone } = autoSchedule !== false
          ? getOptimalDateTime(platform, bestTimes)
          : { dateTime: new Date(Date.now() + 2 * 60000).toISOString().replace('Z', '').split('.')[0], timezone: 'Asia/Riyadh' };

        // 5. بناء payload — V2 API
        const scheduledPost: Record<string, unknown> = {
          publicationDate: { dateTime, timezone },
          text: formattedText,
          providers: [{ network: platform }],
          autoPublish: true,
          saveExternalMediaFiles: true,
          shortener: false,
          draft: false,
        };

        // إضافة الوسائط
        if (normalizedMedia.length > 0) {
          scheduledPost.media = normalizedMedia;
        }

        // بيانات خاصة بكل منصة
        if (platform === 'facebook') {
          scheduledPost.facebookData = { type: 'POST' };
        }
        if (platform === 'instagram') {
          scheduledPost.instagramData = {
            autoPublish: true,
            showReelsInFeed: true,
          };
        }
        if (platform === 'tiktok') {
          scheduledPost.tiktokData = {};
        }
        if (platform === 'youtube') {
          scheduledPost.youtubeData = {
            title: `${perfumeName} | ${perfumeBrand} | مهووس ستور`,
            privacyStatus: 'public',
          };
        }
        if (platform === 'linkedin') {
          scheduledPost.linkedinData = {};
        }
        if (platform === 'pinterest') {
          scheduledPost.pinterestData = {
            title: `${perfumeName} — ${perfumeBrand}`,
            destinationLink: productUrl || '',
          };
        }
        if (platform === 'google_business') {
          scheduledPost.gmbData = {
            topicType: 'STANDARD',
          };
        }

        // 6. إرسال إلى Metricool V2 API
        const url = `${METRICOOL_V2_BASE}/scheduler/posts?blogId=${blogId}${finalUserId ? `&userId=${finalUserId}` : ''}`;

        console.log(`[Smart Publish] ${platform} → POST ${url}`);
        console.log(`[Smart Publish] ${platform} payload:`, JSON.stringify(scheduledPost).substring(0, 500));

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': serverCreds.token,
          },
          body: JSON.stringify(scheduledPost),
        });

        const responseText = await response.text();
        console.log(`[Smart Publish] ${platform} response: ${response.status} ${responseText.substring(0, 300)}`);

        if (response.ok) {
          let result;
          try { result = JSON.parse(responseText); } catch { result = {}; }
          results.push({
            platform,
            success: true,
            postId: result.id || result.postId || 'scheduled',
            scheduledTime: dateTime,
          });
        } else {
          results.push({
            platform,
            success: false,
            error: `HTTP ${response.status}: ${responseText.substring(0, 300)}`,
            debug: `URL: ${url.substring(0, 100)}`,
          });
        }

        // تأخير بين الطلبات
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
        ? `تم جدولة ${successCount} منشور بنجاح${failCount > 0 ? ` (${failCount} فشل)` : ''}`
        : 'فشل النشر على جميع المنصات',
      results,
      diagnostics,
      totalScheduled: successCount,
      totalFailed: failCount,
    });
  } catch (error) {
    console.error('[Smart Publish] Server error:', error);
    return NextResponse.json({
      error: 'خطأ في الخادم',
      details: error instanceof Error ? error.message : 'Unknown',
      diagnostics,
    }, { status: 500 });
  }
}
