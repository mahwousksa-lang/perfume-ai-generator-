// ============================================================
// lib/makeWebhook.ts — Make.com Webhook Integration v2
// إرسال مباشر: التطبيق → Make.com Webhook → المنصات
// بدون وسيط Google Sheets — سيناريو واحد فقط
// ============================================================

import { QueuedPost } from './contentQueue';

// ── حدود الأحرف لكل منصة ─────────────────────────────────────
export const PLATFORM_LIMITS: Record<string, { maxChars: number; label: string }> = {
  instagram: { maxChars: 2200, label: 'انستقرام' },
  facebook:  { maxChars: 33000, label: 'فيسبوك' },
  twitter:   { maxChars: 280, label: 'تويتر/X' },
  linkedin:  { maxChars: 3000, label: 'لينكدإن' },
  tiktok:    { maxChars: 2200, label: 'تيك توك' },
  youtube:   { maxChars: 5000, label: 'يوتيوب' },
  pinterest: { maxChars: 500, label: 'بنترست' },
  telegram:  { maxChars: 4096, label: 'تيليجرام' },
  snapchat:  { maxChars: 80, label: 'سناب شات' },
};

// ── قص النص حسب حد الأحرف ─────────────────────────────────────
function trimToLimit(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  // قص عند آخر مسافة قبل الحد
  const trimmed = text.substring(0, maxChars - 3);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.7 ? trimmed.substring(0, lastSpace) : trimmed) + '...';
}

// ── Webhook URL ─────────────────────────────────────────────
const WEBHOOK_URL_KEY = 'mahwous_make_webhook_url';
const DEFAULT_WEBHOOK_URL = 'https://hook.eu2.make.com/kam6szq27bvdtcyux5wqqlek5a743etq';

export function getWebhookUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_WEBHOOK_URL;
  return localStorage.getItem(WEBHOOK_URL_KEY) || DEFAULT_WEBHOOK_URL;
}

export function setWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WEBHOOK_URL_KEY, url.trim());
}

export function isWebhookConfigured(): boolean {
  const url = getWebhookUrl();
  return url.length > 0 && url.startsWith('https://hook.');
}

// ── تحويل المنشور إلى صيغة Webhook المباشرة ──────────────────
// Make.com يستقبل هذه البيانات ويوزعها مباشرة على المنصات
function postToWebhookPayload(post: QueuedPost): Record<string, string> {
  const igCaption = post.captions?.instagram_post || post.captions?.instagram_story || '';
  const fbCaption = post.captions?.facebook_post || post.captions?.facebook_story || '';
  const twCaption = post.captions?.twitter || '';
  const liCaption = post.captions?.linkedin || '';
  const tkCaption = post.captions?.tiktok || post.videoCaptions?.tiktok_video || '';
  const ytCaption = post.captions?.youtube_thumbnail || post.videoCaptions?.youtube_video || '';
  const piCaption = post.captions?.pinterest || '';
  const tgCaption = post.captions?.whatsapp || ''; // تيليجرام يستخدم نفس كابشن واتساب
  const scCaption = post.captions?.snapchat || '';

  return {
    // ── بيانات المنتج ──
    perfumeName: post.perfumeName || '',
    perfumeBrand: post.perfumeBrand || '',
    productUrl: post.productUrl || '',

    // ── روابط الصور (URL عام مطلوب للنشر) ──
    storyImageUrl: post.storyImageUrl || '',
    postImageUrl: post.postImageUrl || '',
    landscapeImageUrl: post.landscapeImageUrl || '',

    // ── روابط الفيديو ──
    verticalVideoUrl: post.verticalVideoUrl || '',
    horizontalVideoUrl: post.horizontalVideoUrl || '',

    // ── نوع المحتوى ──
    mediaType: (post.verticalVideoUrl || post.horizontalVideoUrl) ? 'video' : 'image',

    // ── كابشنات مقصوصة حسب حد كل منصة ──
    instagramCaption: trimToLimit(igCaption, PLATFORM_LIMITS.instagram.maxChars),
    facebookCaption: trimToLimit(fbCaption, PLATFORM_LIMITS.facebook.maxChars),
    twitterCaption: trimToLimit(twCaption, PLATFORM_LIMITS.twitter.maxChars),
    linkedinCaption: trimToLimit(liCaption, PLATFORM_LIMITS.linkedin.maxChars),
    tiktokCaption: trimToLimit(tkCaption, PLATFORM_LIMITS.tiktok.maxChars),
    youtubeCaption: trimToLimit(ytCaption, PLATFORM_LIMITS.youtube.maxChars),
    pinterestCaption: trimToLimit(piCaption, PLATFORM_LIMITS.pinterest.maxChars),
    telegramCaption: trimToLimit(tgCaption, PLATFORM_LIMITS.telegram.maxChars),
    snapchatCaption: trimToLimit(scCaption, PLATFORM_LIMITS.snapchat.maxChars),

    // ── أعلام النشر (TRUE/FALSE) ──
    postToInstagram: post.platforms.includes('instagram') ? 'TRUE' : 'FALSE',
    postToFacebook: post.platforms.includes('facebook') ? 'TRUE' : 'FALSE',
    postToTwitter: post.platforms.includes('twitter') ? 'TRUE' : 'FALSE',
    postToLinkedIn: post.platforms.includes('linkedin') ? 'TRUE' : 'FALSE',
    postToTikTok: post.platforms.includes('tiktok') ? 'TRUE' : 'FALSE',
    postToYouTube: post.platforms.includes('youtube') ? 'TRUE' : 'FALSE',
    postToPinterest: post.platforms.includes('pinterest') ? 'TRUE' : 'FALSE',
    postToTelegram: post.platforms.includes('telegram') ? 'TRUE' : 'FALSE',
    postToSnapchat: post.platforms.includes('snapchat') ? 'TRUE' : 'FALSE',
  };
}

// ── إرسال منشور واحد إلى Make.com → المنصات مباشرة ──────────
export async function sendToMakeWebhook(post: QueuedPost): Promise<{
  success: boolean;
  message: string;
}> {
  const webhookUrl = getWebhookUrl();
  
  if (!webhookUrl) {
    return {
      success: false,
      message: 'لم يتم إعداد رابط Make.com Webhook. أضف الرابط في الإعدادات.',
    };
  }

  try {
    const payload = postToWebhookPayload(post);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return {
        success: true,
        message: 'تم إرسال المنشور إلى Make.com — جاري النشر على المنصات',
      };
    } else {
      return {
        success: false,
        message: `خطأ من Make.com: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `خطأ في الاتصال: ${error instanceof Error ? error.message : 'غير معروف'}`,
    };
  }
}

// ── إرسال عدة منشورات دفعة واحدة ───────────────────────────
export async function sendBatchToMakeWebhook(posts: QueuedPost[]): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{ postId: string; perfumeName: string; success: boolean; message: string }>;
}> {
  const results: Array<{ postId: string; perfumeName: string; success: boolean; message: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (const post of posts) {
    const result = await sendToMakeWebhook(post);
    results.push({
      postId: post.id,
      perfumeName: post.perfumeName,
      success: result.success,
      message: result.message,
    });
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    // تأخير بسيط بين الطلبات لتجنب rate limiting
    if (posts.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    total: posts.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}
