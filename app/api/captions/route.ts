// ============================================================
// app/api/captions/route.ts
// POST /api/captions
// Generates Arabic social media captions for 15 platform usages.
// v2: SEO optimized — trending hashtags, smart product link handling
// Priority: OpenAI → Claude → Gemini → Static Fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { PerfumeData, PlatformCaptions } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = '+966553964135';
const WHATSAPP_LINK = 'https://wa.me/966553964135';
const STORE_URL = 'https://mahwous.com';

// Max URL length for captions — if product URL is longer, omit it
const MAX_URL_LENGTH = 80;

interface CaptionRequest {
  perfumeData: PerfumeData;
  vibe: string;
  attire: string;
  productUrl: string;
}

// Smart link: only include product URL if short enough
function smartProductLink(productUrl: string): string {
  const url = productUrl || STORE_URL;
  if (url.length > MAX_URL_LENGTH) return STORE_URL;
  return url;
}

// ═══ SEO Trending Hashtags 2025/2026 ═══
const TRENDING_HASHTAGS_AR = [
  '#عطور', '#عطور_فاخرة', '#عطور_رجالية', '#عطور_نسائية',
  '#عطور_نيش', '#عطور_اصلية', '#عطور_خليجية', '#عطور_السعودية',
  '#بارفيوم', '#عود', '#مسك', '#دهن_عود', '#عطر_اليوم',
  '#توصيات_عطور', '#مراجعة_عطور', '#افضل_عطر', '#عطر_رجالي',
  '#عطر_نسائي', '#فخامة', '#اناقة', '#ستايل', '#الرياض',
  '#جدة', '#السعودية', '#متجر_الكتروني', '#توصيل',
];

const TRENDING_HASHTAGS_EN = [
  '#perfume', '#fragrance', '#luxury', '#niche', '#perfumetok',
  '#scentoftheday', '#fragrancecommunity', '#perfumecollection',
  '#luxuryfragrance', '#nicheperfume', '#perfumereview',
  '#bestperfume', '#scentrecommendation', '#oud', '#musk',
  '#arabiaperfume', '#perfumeaddict', '#fragrancelover',
  '#fyp', '#foryou', '#viral', '#trending',
];

function buildPrompt(perfumeData: PerfumeData, vibe: string, attire: string, productUrl: string): string {
  const genderLabel =
    perfumeData.gender === 'men' ? 'للرجال' :
    perfumeData.gender === 'women' ? 'للنساء' : 'للجنسين';

  const productLink = smartProductLink(productUrl);

  return `أنت أفضل خبير تسويق عطور فاخرة ومتخصص SEO في العالم العربي.
مهمتك: كتابة كابشنات احترافية مُحسّنة للبحث والظهور لكل منصة.

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
- المتجر: مهووس (متجر إلكتروني — الطلب أونلاين فقط)

═══ قواعد مهمة جداً — التزم بها 100% ═══
- ممنوع كتابة أي كلمة إنجليزية في نص الكابشن (ما عدا الهاشتاقات)
- المكونات العطرية تُكتب بالعربي فقط: عود، مسك، عنبر، ورد، ياسمين، صندل، باتشولي، فانيلا، بخور، توت، ليمون، برغموت، زنبق، قرنفل، زعفران، خشب الأرز، خشب الصندل، دهن العود
- ممنوع كتابة: oud, amber, musk, vanilla, patchouli, sandalwood, bergamot, jasmine — اكتبها عربي فقط
- لو المكونات المقدمة فيها كلمات إنجليزية، ترجمها للعربي مباشرة
- استخدم كلمات البحث الأكثر تصدراً في كل منصة
- الهاشتاقات فقط يمكن أن تكون مزيج عربي وإنجليزي
- أضف كلمات مفتاحية طبيعية في النص (اسم العطر، الماركة، نوع العطر)
- لا تضع رابط المنتج إذا كان طويلاً — استخدم رابط المتجر العام أو واتساب فقط
- اذكر "مهووس" مرة واحدة فقط في كل كابشن — لا تكرار
- لا تقل "زوروا" أو "زيارة" — مهووس متجر إلكتروني فقط (اطلب/اطلبه)
- اكتب بلهجة سعودية واضحة (مثل: وش رايكم، الحين، خلوني أقولكم)
- السعر يُكتب بالعربي: مثلاً "595 ريال" وليس "595 SAR"

═══ المطلوب: كابشن لكل منصة ═══

1. instagram_post: كابشن طويل شاعري فاخر + 12-15 هاشتاق (أكثرها بحثاً) + CTA + رابط واتساب. لا إيموجي زائد.
2. instagram_story: جملة قصيرة جذابة (سطر أو سطرين) + CTA سريع + رابط.
3. facebook_post: كابشن متوسط تفاعلي + سؤال للجمهور + 5-7 هاشتاقات + رابط واتساب.
4. facebook_story: جملة قصيرة + CTA.
5. twitter: تغريدة قصيرة حادة (أقل من 280 حرف) + 3-4 هاشتاقات ترند + رابط.
6. linkedin: كابشن مهني بالإنجليزي + 5 هاشتاقات إنجليزية ترند.
7. snapchat: قصير جداً وشبابي بلهجة سعودية + رابط واتساب.
8. tiktok: هوك قوي أول كلمة + هاشتاقات الأكثر بحثاً في تيك توك (#perfumetok #fyp #عطور).
9. pinterest: وصف SEO محسّن بالعربي والإنجليزي + كلمات مفتاحية + رابط.
10. telegram: مختصر + رابط المنتج + واتساب + السعر.
11. haraj: وصف تجاري بأسلوب حراج + السعر + التوصيل + رقم التواصل.
12. truth_social: كابشن عربي مختصر + إنجليزي + هاشتاقات.
13. whatsapp: رسالة واتساب جاهزة + تفاصيل + سعر + رابط.
14. youtube_thumbnail: اكتب "—".
15. youtube_shorts: اكتب "—".

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
  // ترجمة المكونات الإنجليزية إلى عربي
  const translateNotes = (raw: string): string => {
    if (!raw) return 'مكونات فاخرة تأسر الحواس';
    const map: Record<string, string> = {
      'oud': 'عود', 'musk': 'مسك', 'amber': 'عنبر', 'vanilla': 'فانيلا',
      'patchouli': 'باتشولي', 'sandalwood': 'صندل', 'bergamot': 'برغموت',
      'jasmine': 'ياسمين', 'rose': 'ورد', 'cedar': 'خشب الأرز', 'vetiver': 'فيتيفر',
      'saffron': 'زعفران', 'cardamom': 'هيل', 'cinnamon': 'قرفة', 'iris': 'زنبق',
      'lavender': 'لافندر', 'tonka': 'تونكا', 'incense': 'بخور', 'leather': 'جلد',
      'tobacco': 'تبغ', 'pepper': 'فلفل', 'ginger': 'زنجبيل', 'lemon': 'ليمون',
      'orange': 'برتقال', 'lime': 'ليم', 'geranium': 'جيرانيوم', 'tuberose': 'مسك الليل',
      'ylang': 'إيلانغ', 'neroli': 'نيرولي', 'benzoin': 'بنزوين', 'myrrh': 'مر',
      'frankincense': 'لبان', 'agarwood': 'دهن العود', 'woody': 'خشبي',
      'floral': 'زهري', 'oriental': 'شرقي', 'fresh': 'منعش', 'citrus': 'حمضي',
      'spicy': 'حار', 'sweet': 'حلو', 'warm': 'دافئ', 'aquatic': 'مائي',
    };
    let result = raw;
    for (const [en, ar] of Object.entries(map)) {
      result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ar);
    }
    return result;
  };
  const notes = translateNotes(perfumeData.notes || '');
  const productLink = smartProductLink(productUrl);
  const price = perfumeData.price || '';
  const gender = perfumeData.gender === 'men' ? 'رجالي' : perfumeData.gender === 'women' ? 'نسائي' : '';

  return {
    instagram_post: `${perfumeData.name} من ${perfumeData.brand}\n\nتجربة عطرية استثنائية تجمع بين الفخامة والأصالة. مكوناته المنتقاة بعناية تمنحك حضوراً لا يُنسى وثباتاً يدوم طوال اليوم.\n\nالمكونات: ${notes}\n${price ? `السعر: ${price.replace(/SAR/gi, 'ريال')}\n` : ''}\nاطلبه الحين من مهووس:\n${WHATSAPP_LINK}\n${productLink}\n\n#عطور_فاخرة #${brand} #عطور #perfume #fragrance #luxury #عطور_اصلية #عطور_نيش #nicheperfume #عطر_اليوم #توصيات_عطور #perfumetok #عطور_السعودية #الرياض #fragrancecommunity`,
    instagram_story: `${perfumeData.name}\nمن ${perfumeData.brand}\n\nاطلبه الحين\n${WHATSAPP_LINK}`,
    facebook_post: `${perfumeData.name} من ${perfumeData.brand}\n\n${notes}\n${price ? `السعر: ${price.replace(/SAR/gi, 'ريال')}\n` : ''}\nوش رايكم فيه؟ جربتوه قبل؟\n\nللطلب: ${WHATSAPP_LINK}\n${productLink}\n\n#عطور_فاخرة #${brand} #عطور #perfume #عطور_اصلية #مهووس`,
    facebook_story: `${perfumeData.name}\n${perfumeData.brand}\nاطلبه الحين\n${WHATSAPP_LINK}`,
    twitter: `${perfumeData.name} من ${perfumeData.brand}\n\nريحة فخمة وثبات خرافي\n\n${WHATSAPP_LINK}\n\n#عطور #${brand} #perfume #عطور_فاخرة`,
    linkedin: `Introducing ${perfumeData.name} by ${perfumeData.brand}\n\nA masterpiece of perfumery that embodies luxury and sophistication.\n\nDiscover more: ${productLink}\n\n#Luxury #Perfume #${brand} #Fragrance #NichePerfume`,
    snapchat: `${perfumeData.name} وصل!\nريحة فخمة من ${perfumeData.brand}\nاطلبه الحين\n${WHATSAPP_LINK}`,
    tiktok: `هالريحة غيرت كل شي!\n${perfumeData.name} من ${perfumeData.brand}\n\nاطلبه من مهووس: ${WHATSAPP_LINK}\n\n#عطور #perfumetok #${brand} #fyp #foryou #عطور_فاخرة #viral #scentoftheday #trending`,
    pinterest: `${perfumeData.name} by ${perfumeData.brand} — Luxury ${gender} Perfume\n\n${notes}\n\nShop: ${productLink}\n\n#LuxuryPerfume #${brand} #Fragrance #عطور_فاخرة #NichePerfume #perfumecollection`,
    telegram: `${perfumeData.name}\n${perfumeData.brand}\n\n${notes}\n${price ? `السعر: ${price.replace(/SAR/gi, 'ريال')}\n` : ''}\nاطلب: ${productLink}\nواتساب: ${WHATSAPP_LINK}`,
    haraj: `للبيع: ${perfumeData.name} من ${perfumeData.brand}\n\n${notes}\n${price ? `السعر: ${price.replace(/SAR/gi, 'ريال')}\n` : ''}\n- أصلي 100%\n- توصيل لجميع مناطق المملكة\n- الدفع عند الاستلام\n\nللتواصل واتساب: ${WHATSAPP_NUMBER}\n${WHATSAPP_LINK}`,
    truth_social: `${perfumeData.name} by ${perfumeData.brand}\n\nLuxury fragrance that speaks elegance\n\n${productLink}\n\n#Perfume #Luxury #${brand}`,
    youtube_thumbnail: '—',
    youtube_shorts: '—',
    whatsapp: `السلام عليكم\n\n${perfumeData.name} من ${perfumeData.brand}\n\n${notes}\n${price ? `السعر: ${price.replace(/SAR/gi, 'ريال')}\n` : ''}\nرابط المنتج: ${productLink}\n\nللطلب تواصل معنا مباشرة`,
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
        content: 'أنت خبير تسويق عطور فاخر ومتخصص SEO بمستوى عالمي. أجب بـ JSON فقط بدون أي نص إضافي. استخدم الهاشتاقات الأكثر بحثاً وتصدراً في كل منصة. لا تكرر كلمة مهووس أكثر من مرة في كل كابشن. مهووس متجر إلكتروني فقط — لا تقل زوروا. ممنوع كتابة أي مكون عطري بالإنجليزي — اكتب كل شيء بالعربي فقط. السعر يُكتب بالعربي مثل: 595 ريال.',
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
