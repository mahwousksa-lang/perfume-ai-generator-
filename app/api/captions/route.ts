// ============================================================
// app/api/captions/route.ts
// POST /api/captions
// Generates Arabic social media captions for 15 platform usages.
// Priority: OpenAI → Claude → Gemini → Static Fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { PerfumeData, PlatformCaptions } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = '+966553964135';
const WHATSAPP_LINK = `https://wa.me/966553964135`;
const STORE_URL = 'https://mahwous.com';

interface CaptionRequest {
  perfumeData: PerfumeData;
  vibe: string;
  attire: string;
  productUrl: string;
}

function buildPrompt(perfumeData: PerfumeData, vibe: string, attire: string, productUrl: string): string {
  const genderLabel =
    perfumeData.gender === 'men' ? 'للرجال' :
    perfumeData.gender === 'women' ? 'للنساء' : 'للجنسين';

  const productLink = productUrl || STORE_URL;

  return `أنت أفضل خبير تسويق عطور فاخرة في العالم العربي، تعمل لدى أكبر البراندات العالمية.
مهمتك: كتابة كابشنات احترافية بمستوى عالمي لكل منصة سوشال ميديا.

═══ معلومات العطر ═══
- الاسم: ${perfumeData.name}
- الماركة: ${perfumeData.brand}
- المستخدم: ${genderLabel}
- المكونات العطرية: ${perfumeData.notes || 'غير محدد'}
- الوصف: ${perfumeData.description?.substring(0, 400) || 'لا يوجد'}
- الأجواء: ${vibe.replace(/_/g, ' ')}
- السعر: ${perfumeData.price || 'غير محدد'}

═══ معلومات التواصل ═══
- واتساب: ${WHATSAPP_NUMBER}
- رابط واتساب: ${WHATSAPP_LINK}
- رابط المنتج: ${productLink}
- المتجر: مهووس للعطور والمنتجات الفاخرة

═══ المطلوب: كابشن لكل منصة واستخدام ═══

1. instagram_post: كابشن طويل شاعري فاخر + 10-15 هاشتاق عربي وإنجليزي + إيموجي محدود + CTA + رابط واتساب + رابط المنتج. أسلوب: فخامة وأناقة.
2. instagram_story: جملة قصيرة جذابة (سطر أو سطرين) + CTA سريع + رابط. أسلوب: مباشر وأنيق.
3. facebook_post: كابشن متوسط تفاعلي + سؤال للجمهور + 5-7 هاشتاقات + رابط واتساب. أسلوب: ودي وتفاعلي.
4. facebook_story: جملة قصيرة + CTA. أسلوب: بسيط ومباشر.
5. twitter: تغريدة قصيرة حادة مؤثرة (أقل من 280 حرف) + 3-4 هاشتاقات + رابط. أسلوب: مباشر وقوي.
6. linkedin: كابشن مهني احترافي يركز على قيمة العلامة التجارية والحرفية + 5 هاشتاقات إنجليزية. أسلوب: مهني وراقي.
7. snapchat: قصير جداً وشبابي + إيموجي + رابط واتساب. أسلوب: عفوي وجذاب.
8. tiktok: هوك قوي في أول كلمة + حركي + ترند + هاشتاقات شبابية. أسلوب: ترند وشبابي.
9. pinterest: وصف SEO محسّن بالعربي والإنجليزي + كلمات مفتاحية + رابط. أسلوب: وصفي ومحسّن للبحث.
10. telegram: مختصر ومباشر + رابط المنتج + رابط واتساب + السعر. أسلوب: إخباري ومباشر.
11. haraj: وصف تجاري مباشر بأسلوب حراج + السعر + التوصيل + الضمان + رقم التواصل. أسلوب: تجاري سعودي.
12. truth_social: كابشن عربي مختصر + إنجليزي + هاشتاقات. أسلوب: مختصر وأنيق.
13. whatsapp: رسالة واتساب جاهزة للإرسال + تفاصيل المنتج + السعر + رابط. أسلوب: رسالة شخصية مهنية.
14. youtube_thumbnail: لا يحتاج كابشن (اكتب "—").
15. youtube_shorts: لا يحتاج كابشن (اكتب "—").

═══ قواعد عامة ═══
- كل كابشن يجب أن يكون مختلف تماماً عن الآخر — لا تكرار
- استخدم اللهجة السعودية/الخليجية عند المناسب
- الهاشتاقات يجب أن تكون مزيج عربي وإنجليزي
- كل كابشن يجب أن يناسب جمهور المنصة وثقافتها
- المستوى المطلوب: كأننا أكبر براند عطور في العالم

أجب بـ JSON فقط بدون أي نص إضافي:
{
  "instagram_post": "...",
  "instagram_story": "...",
  "facebook_post": "...",
  "facebook_story": "...",
  "twitter": "...",
  "linkedin": "...",
  "snapchat": "...",
  "tiktok": "...",
  "pinterest": "...",
  "telegram": "...",
  "haraj": "...",
  "truth_social": "...",
  "whatsapp": "...",
  "youtube_thumbnail": "—",
  "youtube_shorts": "—"
}`;
}

function buildFallbackCaptions(perfumeData: PerfumeData, productUrl: string): PlatformCaptions {
  const brand = perfumeData.brand?.replace(/\s/g, '') || 'mahwous';
  const notes = perfumeData.notes || 'نوتات ساحرة تأسر الحواس';
  const productLink = productUrl || STORE_URL;
  const price = perfumeData.price || '';

  return {
    instagram_post: `✨ ${perfumeData.name} من ${perfumeData.brand}\n\nعطرٌ يُجسّد روح الفخامة ويُحكي قصة الأناقة الأصيلة ✨\n\n🌸 المكونات: ${notes}\n${price ? `💰 السعر: ${price}\n` : ''}\n🛒 اطلب الآن:\n📞 واتساب: ${WHATSAPP_NUMBER}\n💬 ${WHATSAPP_LINK}\n🔗 المنتج: ${productLink}\n\n#${brand} #عطور_فاخرة #مهووس_للعطور #perfume #luxury #عطور_خليجية #عطور_رجالية #فخامة #عطر #fragrance #niche_perfume #عطور_نيش #السعودية #الرياض`,
    instagram_story: `✨ ${perfumeData.name}\nمن ${perfumeData.brand}\n\n⬆️ اسحب للأعلى للطلب\n${WHATSAPP_LINK}`,
    facebook_post: `${perfumeData.name} من ${perfumeData.brand} ✨\n\nعطر يستحق التجربة — ${notes}\n${price ? `السعر: ${price}\n` : ''}\nما رأيكم؟ جربتوه قبل؟ 💬\n\n📞 للطلب: ${WHATSAPP_LINK}\n🔗 ${productLink}\n\n#عطور_فاخرة #${brand} #مهووس #عطور`,
    facebook_story: `✨ ${perfumeData.name}\n${perfumeData.brand}\nاطلب الآن 👇\n${WHATSAPP_LINK}`,
    twitter: `✨ ${perfumeData.name} — ${perfumeData.brand}\n\nأناقةٌ لا تُنسى في كل رشّة 🌸\n\n🛒 ${WHATSAPP_LINK}\n\n#عطور_فاخرة #${brand} #مهووس #perfume`,
    linkedin: `Introducing ${perfumeData.name} by ${perfumeData.brand}\n\nA masterpiece of perfumery that embodies luxury and sophistication. ${notes}\n\nDiscover more: ${productLink}\n\n#Luxury #Perfume #${brand} #Fragrance #NichePerfume`,
    snapchat: `💛 ${perfumeData.name} وصل!\nرائحة فاخرة 🌟\nاطلب الحين 👇\n${WHATSAPP_LINK}`,
    tiktok: `🔥 عطر ${perfumeData.name} من ${perfumeData.brand} — هذا اللي كنت تدور عليه!\n✨ ${notes}\n📦 اطلب الحين: ${WHATSAPP_LINK}\n#عطور #ترند #${brand} #مهووس_للعطور #fyp #foryou #عطور_فاخرة`,
    pinterest: `${perfumeData.name} by ${perfumeData.brand} — Luxury Perfume | عطر فاخر\n\n${notes}\n\nPerfect for: ${perfumeData.gender === 'men' ? 'Men' : perfumeData.gender === 'women' ? 'Women' : 'Unisex'}\n\nShop now: ${productLink}\n\n#LuxuryPerfume #${brand} #Fragrance #عطور_فاخرة #NichePerfume`,
    telegram: `🌟 ${perfumeData.name}\n${perfumeData.brand}\n\n${notes}\n${price ? `💰 ${price}\n` : ''}\n🛒 اطلب: ${productLink}\n📞 واتساب: ${WHATSAPP_LINK}`,
    haraj: `للبيع: ${perfumeData.name} من ${perfumeData.brand}\n\n${notes}\n${price ? `السعر: ${price}\n` : ''}\n✅ أصلي 100%\n✅ توصيل لجميع مناطق المملكة\n✅ الدفع عند الاستلام\n\n📞 للتواصل واتساب: ${WHATSAPP_NUMBER}\n${WHATSAPP_LINK}`,
    truth_social: `✨ ${perfumeData.name} by ${perfumeData.brand}\n\nLuxury fragrance that speaks elegance\n\n🛒 ${productLink}\n\n#Perfume #Luxury #${brand}`,
    youtube_thumbnail: '—',
    youtube_shorts: '—',
    whatsapp: `السلام عليكم 🌟\n\nعطر ${perfumeData.name} من ${perfumeData.brand}\n\n${notes}\n${price ? `💰 السعر: ${price}\n` : ''}\n🔗 رابط المنتج: ${productLink}\n\nللطلب تواصل معنا مباشرة على هذا الرقم ✨`,
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
    max_tokens: 4000,
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: 'أنت خبير تسويق عطور فاخر بمستوى عالمي. أجب بـ JSON فقط بدون أي نص إضافي.',
      },
      { role: 'user', content: prompt },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? '{}';
}

async function callClaude(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
}

export async function POST(request: NextRequest) {
  try {
    const { perfumeData, vibe, attire, productUrl }: CaptionRequest = await request.json();

    if (!perfumeData?.name) {
      return NextResponse.json({ error: 'perfumeData.name is required.' }, { status: 400 });
    }

    const prompt = buildPrompt(perfumeData, vibe, attire, productUrl);
    const fallback = buildFallbackCaptions(perfumeData, productUrl);

    let rawText = '{}';
    let source = 'fallback';

    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      try {
        rawText = await callOpenAI(prompt);
        source = 'openai';
        console.log('[/api/captions] Used OpenAI successfully');
      } catch (openaiError: unknown) {
        const msg = openaiError instanceof Error ? openaiError.message : String(openaiError);
        console.warn('[/api/captions] OpenAI failed:', msg);
      }
    }

    // Try Claude as secondary
    if (source === 'fallback' && process.env.ANTHROPIC_API_KEY) {
      try {
        rawText = await callClaude(prompt);
        source = 'claude';
        console.log('[/api/captions] Used Claude successfully');
      } catch (claudeError: unknown) {
        const msg = claudeError instanceof Error ? claudeError.message : String(claudeError);
        console.warn('[/api/captions] Claude failed:', msg);
      }
    }

    // If both failed, return static fallback
    if (source === 'fallback') {
      console.log('[/api/captions] Using static fallback captions');
      return NextResponse.json({ captions: fallback, source: 'fallback' }, { status: 200 });
    }

    // Parse the AI response
    let captions: PlatformCaptions = fallback;
    try {
      const clean = rawText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(clean);
      captions = {
        instagram_post: parsed.instagram_post || fallback.instagram_post,
        instagram_story: parsed.instagram_story || fallback.instagram_story,
        facebook_post: parsed.facebook_post || fallback.facebook_post,
        facebook_story: parsed.facebook_story || fallback.facebook_story,
        twitter: parsed.twitter || fallback.twitter,
        linkedin: parsed.linkedin || fallback.linkedin,
        snapchat: parsed.snapchat || fallback.snapchat,
        tiktok: parsed.tiktok || fallback.tiktok,
        pinterest: parsed.pinterest || fallback.pinterest,
        telegram: parsed.telegram || fallback.telegram,
        haraj: parsed.haraj || fallback.haraj,
        truth_social: parsed.truth_social || fallback.truth_social,
        whatsapp: parsed.whatsapp || fallback.whatsapp,
        youtube_thumbnail: '—',
        youtube_shorts: '—',
      };
    } catch {
      console.warn('[/api/captions] JSON parse failed, using fallback captions.');
    }

    return NextResponse.json({ captions, source }, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/captions] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Caption generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
