// ============================================================
// app/api/video-captions/route.ts
// POST /api/video-captions
// Generates Arabic social media captions for video platforms.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { PerfumeData, VideoPlatformCaptions } from '@/lib/types';

export const maxDuration = 20;
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = '+966553964135';
const WHATSAPP_LINK = 'https://wa.me/966553964135';
const STORE_URL = 'https://mahwous.com';

interface VideoCaptionRequest {
  perfumeData: PerfumeData;
  productUrl: string;
  vibe: string;
}

function buildVideoCaptionPrompt(perfumeData: PerfumeData, productUrl: string, vibe: string): string {
  const genderLabel =
    perfumeData.gender === 'men' ? 'للرجال' :
    perfumeData.gender === 'women' ? 'للنساء' : 'للجنسين';

  const productLink = productUrl || STORE_URL;

  return `أنت أفضل خبير تسويق فيديو عطور فاخرة. اكتب كابشنات فيديو احترافية لكل منصة.

═══ معلومات العطر ═══
- الاسم: ${perfumeData.name}
- الماركة: ${perfumeData.brand}
- المستخدم: ${genderLabel}
- المكونات: ${perfumeData.notes || 'غير محدد'}
- السعر: ${perfumeData.price || 'غير محدد'}

═══ معلومات التواصل ═══
- واتساب: ${WHATSAPP_NUMBER}
- رابط واتساب: ${WHATSAPP_LINK}
- رابط المنتج: ${productLink}
- المتجر: مهووس للعطور

═══ المطلوب: كابشن فيديو لكل منصة ═══

1. instagram_reels: كابشن ريلز قصير + هوك قوي + 8-10 هاشتاقات + CTA. أسلوب: ترند وجذاب.
2. tiktok_video: هوك أول 3 ثواني + نص ترند + هاشتاقات شبابية. أسلوب: شبابي وحركي.
3. snapchat_video: قصير جداً وعفوي + إيموجي + رابط. أسلوب: سناب شات.
4. youtube_shorts: عنوان جذاب + وصف قصير + CTA + هاشتاقات. أسلوب: يوتيوب.
5. facebook_stories_video: جملة قصيرة + CTA + رابط. أسلوب: فيسبوك.
6. youtube_video: عنوان + وصف متوسط + كلمات مفتاحية + CTA. أسلوب: يوتيوب احترافي.
7. twitter_video: تغريدة قصيرة مع الفيديو (أقل من 280 حرف) + هاشتاقات. أسلوب: مباشر.
8. linkedin_video: كابشن مهني + قيمة العلامة التجارية. أسلوب: احترافي.
9. facebook_video: كابشن تفاعلي + سؤال + CTA. أسلوب: تفاعلي.

أجب بـ JSON فقط:
{
  "instagram_reels": "...",
  "tiktok_video": "...",
  "snapchat_video": "...",
  "youtube_shorts": "...",
  "facebook_stories_video": "...",
  "youtube_video": "...",
  "twitter_video": "...",
  "linkedin_video": "...",
  "facebook_video": "..."
}`;
}

function buildFallbackVideoCaptions(perfumeData: PerfumeData, productUrl: string): VideoPlatformCaptions {
  const brand = perfumeData.brand?.replace(/\s/g, '') || 'mahwous';
  const productLink = productUrl || STORE_URL;

  return {
    instagram_reels: `🔥 شوفوا هالعطر الأسطوري!\n${perfumeData.name} من ${perfumeData.brand}\n\n✨ فخامة ما لها حدود\n📦 اطلب الحين: ${WHATSAPP_LINK}\n\n#عطور #ريلز #${brand} #مهووس_للعطور #perfume #luxury #fyp #عطور_فاخرة`,
    tiktok_video: `⛔️ لا تشتري عطر قبل ما تشوف هذا!\n${perfumeData.name} من ${perfumeData.brand} 🔥\n\n📦 الرابط في البايو\n${WHATSAPP_LINK}\n\n#عطور #ترند #${brand} #fyp #foryou #عطور_فاخرة #مهووس`,
    snapchat_video: `💛 ${perfumeData.name} وصل!\nعطر فاخر من ${perfumeData.brand} 🌟\nاطلب الحين 👇\n${WHATSAPP_LINK}`,
    youtube_shorts: `${perfumeData.name} — ${perfumeData.brand} | مراجعة سريعة 🌟\n\nعطر فاخر يستحق التجربة!\n📦 اطلب: ${productLink}\n\n#عطور #${brand} #shorts #perfume`,
    facebook_stories_video: `✨ ${perfumeData.name}\n${perfumeData.brand}\n\nاسحب للأعلى للطلب 👆\n${WHATSAPP_LINK}`,
    youtube_video: `${perfumeData.name} من ${perfumeData.brand} — مراجعة كاملة | مهووس للعطور\n\nاكتشف عطر ${perfumeData.name} الفاخر من ${perfumeData.brand}.\n\n🛒 اطلب الآن: ${productLink}\n📞 واتساب: ${WHATSAPP_LINK}\n\n#عطور_فاخرة #${brand} #مهووس_للعطور #perfume #luxury`,
    twitter_video: `✨ ${perfumeData.name} — ${perfumeData.brand}\n\nعطر يستحق كل ريال 🌟\n\n🛒 ${WHATSAPP_LINK}\n\n#عطور #${brand} #مهووس`,
    linkedin_video: `Introducing ${perfumeData.name} by ${perfumeData.brand}\n\nA masterpiece of modern perfumery.\n\nDiscover more: ${productLink}\n\n#Luxury #Perfume #${brand} #Fragrance`,
    facebook_video: `${perfumeData.name} من ${perfumeData.brand} ✨\n\nشاهد الفيديو وقولوا لنا رأيكم! 💬\n\n📦 للطلب: ${WHATSAPP_LINK}\n🔗 ${productLink}\n\n#عطور_فاخرة #${brand} #مهووس`,
  };
}

async function callOpenAI(prompt: string): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    max_tokens: 3000,
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: 'أنت خبير تسويق فيديو عطور فاخر. أجب بـ JSON فقط.',
      },
      { role: 'user', content: prompt },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? '{}';
}

export async function POST(request: NextRequest) {
  try {
    const { perfumeData, productUrl, vibe }: VideoCaptionRequest = await request.json();

    if (!perfumeData?.name) {
      return NextResponse.json({ error: 'perfumeData.name is required.' }, { status: 400 });
    }

    const prompt = buildVideoCaptionPrompt(perfumeData, productUrl, vibe);
    const fallback = buildFallbackVideoCaptions(perfumeData, productUrl);

    let captions: VideoPlatformCaptions = fallback;
    let source = 'fallback';

    // Try OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const rawText = await callOpenAI(prompt);
        const clean = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(clean);
        captions = {
          instagram_reels: parsed.instagram_reels || fallback.instagram_reels,
          tiktok_video: parsed.tiktok_video || fallback.tiktok_video,
          snapchat_video: parsed.snapchat_video || fallback.snapchat_video,
          youtube_shorts: parsed.youtube_shorts || fallback.youtube_shorts,
          facebook_stories_video: parsed.facebook_stories_video || fallback.facebook_stories_video,
          youtube_video: parsed.youtube_video || fallback.youtube_video,
          twitter_video: parsed.twitter_video || fallback.twitter_video,
          linkedin_video: parsed.linkedin_video || fallback.linkedin_video,
          facebook_video: parsed.facebook_video || fallback.facebook_video,
        };
        source = 'openai';
      } catch (err) {
        console.warn('[video-captions] OpenAI failed:', err);
      }
    }

    return NextResponse.json({ captions, source });
  } catch (error: unknown) {
    console.error('[/api/video-captions] Error:', error);
    const message = error instanceof Error ? error.message : 'Video caption generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
