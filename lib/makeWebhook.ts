// ============================================================
// lib/makeWebhook.ts — Make.com Webhook Integration
// يرسل بيانات المنشور مباشرة إلى Make.com Webhook
// الذي يكتبها في Google Sheets تلقائياً
// ============================================================

import { QueuedPost } from './contentQueue';

// ── Webhook URL ─────────────────────────────────────────────
// يتم تخزينه في localStorage حتى يضيفه المستخدم مرة واحدة
const WEBHOOK_URL_KEY = 'mahwous_make_webhook_url';

export function getWebhookUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(WEBHOOK_URL_KEY) || '';
}

export function setWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WEBHOOK_URL_KEY, url.trim());
}

export function isWebhookConfigured(): boolean {
  const url = getWebhookUrl();
  return url.length > 0 && url.startsWith('https://hook.');
}

// ── تحويل المنشور إلى صيغة Webhook ────────────────────────
function postToWebhookPayload(post: QueuedPost): Record<string, string> {
  return {
    timestamp: post.timestamp,
    perfumeName: post.perfumeName,
    perfumeBrand: post.perfumeBrand,
    productUrl: post.productUrl,
    storyImageUrl: post.storyImageUrl || '',
    postImageUrl: post.postImageUrl || '',
    landscapeImageUrl: post.landscapeImageUrl || '',
    verticalVideoUrl: post.verticalVideoUrl || '',
    horizontalVideoUrl: post.horizontalVideoUrl || '',
    mediaType: (post.verticalVideoUrl || post.horizontalVideoUrl) ? 'video' : 'image',
    instagramCaption: post.captions?.instagram_post || post.captions?.instagram_story || '',
    facebookCaption: post.captions?.facebook_post || post.captions?.facebook_story || '',
    twitterCaption: post.captions?.twitter || '',
    linkedinCaption: post.captions?.linkedin || '',
    tiktokCaption: post.captions?.tiktok || post.videoCaptions?.tiktok_video || '',
    youtubeCaption: post.captions?.youtube_thumbnail || post.videoCaptions?.youtube_video || '',
    pinterestCaption: post.captions?.pinterest || '',
    snapchatCaption: post.captions?.snapchat || '',
    whatsappCaption: post.captions?.whatsapp || '',
    postToInstagram: post.platforms.includes('instagram') ? 'TRUE' : 'FALSE',
    postToFacebook: post.platforms.includes('facebook') ? 'TRUE' : 'FALSE',
    postToTwitter: post.platforms.includes('twitter') ? 'TRUE' : 'FALSE',
    postToLinkedIn: post.platforms.includes('linkedin') ? 'TRUE' : 'FALSE',
    postToTikTok: post.platforms.includes('tiktok') ? 'TRUE' : 'FALSE',
    postToYouTube: post.platforms.includes('youtube') ? 'TRUE' : 'FALSE',
    postToPinterest: post.platforms.includes('pinterest') ? 'TRUE' : 'FALSE',
    postToSnapchat: post.platforms.includes('snapchat') ? 'TRUE' : 'FALSE',
    postToWhatsApp: post.platforms.includes('whatsapp') ? 'TRUE' : 'FALSE',
    scheduledTime: post.scheduledTime || '',
    status: post.status || 'scheduled',
  };
}

// ── إرسال منشور واحد إلى Make.com ──────────────────────────
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
        message: 'تم إرسال المنشور إلى Google Sheets بنجاح عبر Make.com',
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
