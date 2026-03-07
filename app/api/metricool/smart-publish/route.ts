import { NextRequest, NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/metricool/smart-publish — النشر الذكي عبر Metricool API
// V4: إصلاح حقول API + التاريخ + الوسائط + تشخيص مفصل
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
      return [caption, '', `🛒 اطلبه: ${productUrl}`, '', signature, '', hashtagStr].join('\n');
    case 'pinterest':
      return [caption, '', hashtagStr].join('\n');
    case 'google_business':
      return [caption, '', `🛒 ${productUrl}`, '', signature].join('\n');
    default:
      return `${caption}\n\n${signature}\n\n${hashtagStr}`;
  }
}

// ── أوقات النشر المثالية — دائماً في المستقبل ────────────────────────────────
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

  // حساب الوقت بتوقيت السعودية (UTC+3)
  const now = new Date();
  const saudiOffset = 3 * 60; // +3 hours in minutes
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const saudiNow = new Date(utcNow + (saudiOffset * 60000));

  // إنشاء التاريخ المجدول بتوقيت السعودية
  const scheduled = new Date(saudiNow);
  scheduled.setHours(hour, 0, 0, 0);

  // إذا كان الوقت في الماضي، أضف يوم
  if (scheduled.getTime() <= saudiNow.getTime()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  // تنسيق التاريخ بدون timezone info
  const year = scheduled.getFullYear();
  const month = String(scheduled.getMonth() + 1).padStart(2, '0');
  const day = String(scheduled.getDate()).padStart(2, '0');
  const hours = String(scheduled.getHours()).padStart(2, '0');
  const minutes = String(scheduled.getMinutes()).padStart(2, '0');
  const seconds = String(scheduled.getSeconds()).padStart(2, '0');

  return {
    dateTime: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`,
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
  const videoFirst = ['tiktok', 'youtube', 'instagram'];

  if (videoFirst.includes(platform)) {
    if (platform === 'youtube' && videoUrls.horizontal) {
      return { urls: [videoUrls.horizontal], isVideo: true };
    }
    if (videoUrls.vertical) {
      return { urls: [videoUrls.vertical], isVideo: true };
    }
  }

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
// POST Handler — النشر الذكي V4
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

    // ── تشخيص الوسائط المرسلة ──────────────────────────────────────
    diagnostics.push(`imageUrls received: ${JSON.stringify(imageUrls || {})}`.substring(0, 300));
    diagnostics.push(`videoUrls received: ${JSON.stringify(videoUrls || {})}`.substring(0, 300));
    const imgCount = imageUrls ? Object.values(imageUrls).filter(Boolean).length : 0;
    const vidCount = videoUrls ? Object.values(videoUrls).filter(Boolean).length : 0;
    diagnostics.push(`Total media: ${imgCount} images, ${vidCount} videos`);
    if (imageUrls) {
      Object.entries(imageUrls).forEach(([k, v]) => {
        diagnostics.push(`  image.${k}: ${v ? String(v).substring(0, 80) : 'EMPTY'}`);
      });
    }
    if (videoUrls) {
      Object.entries(videoUrls).forEach(([k, v]) => {
        diagnostics.push(`  video.${k}: ${v ? String(v).substring(0, 80) : 'EMPTY'}`);
      });
    }

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
            try {
              const normalized = await uploadMediaToMetricool(mediaUrl, serverCreds.token, blogId);
              if (normalized) {
                normalizedMedia.push(normalized);
              } else {
                // fallback: استخدم الرابط الأصلي
                normalizedMedia.push(mediaUrl);
                diagnostics.push(`${platform}: normalize returned empty, using original URL`);
              }
            } catch (e) {
              // fallback: استخدم الرابط الأصلي
              normalizedMedia.push(mediaUrl);
              diagnostics.push(`${platform}: normalize error, using original URL`);
            }
          }
        }

        diagnostics.push(`${platform}: media=${normalizedMedia.length}, isVideo=${selectedMedia.isVideo}, urls=${normalizedMedia.map(u => u.substring(0, 50)).join(', ')}`);

        // 4. تحديد وقت النشر — دائماً في المستقبل
        const { dateTime, timezone } = autoSchedule !== false
          ? getOptimalDateTime(platform, bestTimes)
          : getOptimalDateTime(platform); // حتى النشر الفوري يكون بعد 5 دقائق

        diagnostics.push(`${platform}: scheduledTime=${dateTime} ${timezone}`);

        // 5. بناء payload — V2 API (حقول صحيحة فقط)
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

        // ══════ بيانات خاصة بكل منصة — حقول صحيحة فقط ══════
        if (platform === 'facebook') {
          scheduledPost.facebookData = { type: 'POST' };
        }

        if (platform === 'instagram') {
          // فقط autoPublish — بدون showReelsInFeed (حقل غير معروف)
          scheduledPost.instagramData = {
            autoPublish: true,
          };
        }

        if (platform === 'tiktok') {
          scheduledPost.tiktokData = {};
        }

        if (platform === 'youtube') {
          // privacy بدلاً من privacyStatus
          scheduledPost.youtubeData = {
            title: `${perfumeName} | ${perfumeBrand} | مهووس ستور`,
            privacy: 'PUBLIC',
            madeForKids: false,
            type: selectedMedia.isVideo ? 'VIDEO' : 'SHORT',
            category: '22', // People & Blogs
            tags: platformHashtags.map((h: string) => h.replace('#', '')).slice(0, 10),
          };
        }

        if (platform === 'linkedin') {
          scheduledPost.linkedinData = {};
        }

        if (platform === 'pinterest') {
          // destinationLink فقط — بدون title (حقل غير معروف)
          scheduledPost.pinterestData = {
            destinationLink: productUrl || '',
          };
          // Pinterest يحتاج title في النص الرئيسي
          scheduledPost.text = `${perfumeName} — ${perfumeBrand}\n\n${formattedText}`;
        }

        if (platform === 'google_business') {
          scheduledPost.gmbData = {
            topicType: 'STANDARD',
          };
        }

        // 6. إرسال إلى Metricool V2 API
        const url = `${METRICOOL_V2_BASE}/scheduler/posts?blogId=${blogId}${finalUserId ? `&userId=${finalUserId}` : ''}`;

        console.log(`[Smart Publish V4] ${platform} → POST ${url}`);
        console.log(`[Smart Publish V4] ${platform} payload:`, JSON.stringify(scheduledPost).substring(0, 800));

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': serverCreds.token,
          },
          body: JSON.stringify(scheduledPost),
        });

        const responseText = await response.text();
        console.log(`[Smart Publish V4] ${platform} response: ${response.status} ${responseText.substring(0, 500)}`);

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
            error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
            debug: `URL: ${url}`,
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
    console.error('[Smart Publish V4] Server error:', error);
    return NextResponse.json({
      error: 'خطأ في الخادم',
      details: error instanceof Error ? error.message : 'Unknown',
      diagnostics,
    }, { status: 500 });
  }
}
