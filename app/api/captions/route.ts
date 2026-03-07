// ============================================================
// app/api/captions/route.ts
// POST /api/captions
// v3: Hybrid approach — mahwousCaptionEngine as base + AI enhancement
// Priority: CaptionEngine + AI Enhancement → CaptionEngine only → Static Fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { PerfumeData, PlatformCaptions } from '@/lib/types';
import {
  generateAllCaptions,
  generateAllHashtags,
  translateNotes,
  MAHWOUS_IDENTITY,
  SEO_KEYWORDS,
} from '@/lib/mahwousCaptionEngine';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = MAHWOUS_IDENTITY.whatsapp;
const WHATSAPP_LINK = MAHWOUS_IDENTITY.whatsappLink;
const STORE_URL = MAHWOUS_IDENTITY.storeUrl;

const MAX_URL_LENGTH = 80;

interface CaptionRequest {
  perfumeData: PerfumeData;
  vibe: string;
  attire: string;
  productUrl: string;
}

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

// ═══ AI Enhancement Prompt ═══
function buildEnhancementPrompt(perfumeData: PerfumeData, vibe: string, baseCaptions: Record<string, string>, productUrl: string): string {
  const genderLabel =
    perfumeData.gender === 'men' ? 'للرجال' :
    perfumeData.gender === 'women' ? 'للنساء' : 'للجنسين';

  const productLink = smartProductLink(productUrl);

  return `أنت خبير تسويق عطور فاخرة ومتخصص SEO.
مهمتك: تحسين الكابشنات التالية وجعلها أكثر جاذبية وتفاعلية مع الحفاظ على الأسلوب والهوية.

═══ معلومات العطر ═══
- الاسم: ${perfumeData.name}
- الماركة: ${perfumeData.brand}
- المستخدم: ${genderLabel}
- المكونات: ${translateNotes(perfumeData.notes || '')}
- الوصف: ${perfumeData.description?.substring(0, 300) || 'لا يوجد'}
- الأجواء: ${vibe.replace(/_/g, ' ')}
- السعر: ${perfumeData.price || 'غير محدد'}

═══ معلومات التواصل ═══
- واتساب: ${WHATSAPP_NUMBER}
- رابط واتساب: ${WHATSAPP_LINK}
- رابط المنتج: ${productLink}
- المتجر: مهووس (متجر إلكتروني — الطلب أونلاين فقط)

═══ قواعد مهمة ═══
- ممنوع كتابة أي مكون عطري بالإنجليزي — اكتب كل شيء بالعربي
- اذكر "مهووس" مرة واحدة فقط في كل كابشن
- لا تقل "زوروا" — مهووس متجر إلكتروني (اطلب/اطلبه)
- اكتب بلهجة سعودية واضحة
- السعر يُكتب بالعربي: "595 ريال" وليس "595 SAR"
- حافظ على نفس الطول والأسلوب تقريباً

═══ الكابشنات الأساسية (حسّنها) ═══
${JSON.stringify(baseCaptions, null, 2)}

أجب بـ JSON فقط بنفس المفاتيح:`;
}

// ═══ AI Callers ═══
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
        content: 'أنت خبير تسويق عطور فاخر ومتخصص SEO. أجب بـ JSON فقط. ممنوع كتابة مكونات عطرية بالإنجليزي. اكتب بلهجة سعودية.',
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

// ═══ Main Handler ═══
export async function POST(request: NextRequest) {
  try {
    const { perfumeData, vibe, attire, productUrl }: CaptionRequest = await request.json();

    if (!perfumeData?.name) {
      return NextResponse.json({ error: 'perfumeData.name is required.' }, { status: 400 });
    }

    // ── Step 1: توليد كابشنات أساسية من محرك مهووس ──
    const baseCaptions = generateAllCaptions(
      perfumeData.name,
      perfumeData.brand,
      productUrl,
      perfumeData.notes,
      perfumeData.description,
      perfumeData.price,
    );

    const baseHashtags = generateAllHashtags(perfumeData.name, perfumeData.brand);

    console.log('[/api/captions] Generated base captions from mahwousCaptionEngine');

    // ── Step 2: تحسين بالذكاء الاصطناعي (اختياري) ──
    let enhancedCaptions: Record<string, string> | null = null;
    let source = 'mahwous_engine';

    const enhancementPrompt = buildEnhancementPrompt(perfumeData, vibe, baseCaptions, productUrl);

    // Try OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const rawText = await callOpenAI(enhancementPrompt);
        const clean = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        enhancedCaptions = JSON.parse(clean);
        source = 'mahwous_engine+openai';
        console.log('[/api/captions] Enhanced with OpenAI');
      } catch (e) {
        console.warn('[/api/captions] OpenAI enhancement failed:', e instanceof Error ? e.message : e);
      }
    }

    // Try Claude as fallback
    if (!enhancedCaptions && process.env.ANTHROPIC_API_KEY) {
      try {
        const rawText = await callClaude(enhancementPrompt);
        const clean = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        enhancedCaptions = JSON.parse(clean);
        source = 'mahwous_engine+claude';
        console.log('[/api/captions] Enhanced with Claude');
      } catch (e) {
        console.warn('[/api/captions] Claude enhancement failed:', e instanceof Error ? e.message : e);
      }
    }

    // ── Step 3: دمج النتائج ──
    const finalCaptions: PlatformCaptions = {
      instagram_post: enhancedCaptions?.instagram_post || baseCaptions.instagram_post || '',
      instagram_story: enhancedCaptions?.instagram_story || baseCaptions.instagram_story || '',
      facebook_post: enhancedCaptions?.facebook_post || baseCaptions.facebook_post || '',
      facebook_story: enhancedCaptions?.facebook_story || baseCaptions.facebook_story || '',
      twitter: enhancedCaptions?.twitter || baseCaptions.twitter || '',
      linkedin: enhancedCaptions?.linkedin || baseCaptions.linkedin || '',
      snapchat: enhancedCaptions?.snapchat || baseCaptions.snapchat || '',
      tiktok: enhancedCaptions?.tiktok || baseCaptions.tiktok || '',
      pinterest: enhancedCaptions?.pinterest || baseCaptions.pinterest || '',
      telegram: enhancedCaptions?.telegram || baseCaptions.telegram || '',
      haraj: enhancedCaptions?.haraj || baseCaptions.haraj || '',
      truth_social: enhancedCaptions?.truth_social || baseCaptions.truth_social || '',
      whatsapp: enhancedCaptions?.whatsapp || baseCaptions.whatsapp || '',
      youtube_thumbnail: enhancedCaptions?.youtube_thumbnail || baseCaptions.youtube_thumbnail || '—',
      youtube_shorts: enhancedCaptions?.youtube_shorts || baseCaptions.youtube_shorts || '—',
    };

    return NextResponse.json({
      captions: finalCaptions,
      hashtags: baseHashtags,
      source,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/captions] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Caption generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
