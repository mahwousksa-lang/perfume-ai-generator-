// ============================================================
// app/api/captions/route.ts
// POST /api/captions
// Generates Arabic social media captions.
// Priority: OpenAI → Claude → Static Fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { PerfumeData } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = '+966553964135';
const WHATSAPP_LINK = `https://wa.me/966553964135`;

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

  return `أنت خبير تسويق عطور فاخر متخصص في السوق الخليجي والعربي.

معلومات العطر:
- الاسم: ${perfumeData.name}
- الماركة: ${perfumeData.brand}
- المستخدم: ${genderLabel}
- المكونات العطرية: ${perfumeData.notes || 'غير محدد'}
- الوصف: ${perfumeData.description?.substring(0, 300) || 'لا يوجد'}
- الأجواء: ${vibe.replace(/_/g, ' ')}

معلومات التواصل:
- واتساب: ${WHATSAPP_NUMBER}
- رابط واتساب: ${WHATSAPP_LINK}
- رابط المنتج: ${productUrl || 'https://mahwous.com'}

أنشئ كابشن احترافي شعري فاخر لكل منصة.
قواعد:
- انستغرام: جملة شعرية + 5-8 هاشتاقات عربية + إيموجيات + رابط واتساب + رابط المنتج
- تويتر: مباشر مؤثر + 3-5 هاشتاقات + إيموجيات + رابط واتساب
- تيك توك: هوك قوي في أول جملة + حركي + ترند + هاشتاقات شبابية
- سناب شات: قصير جذاب + إيموجيات + رابط واتساب

أجب بـ JSON فقط بدون أي نص إضافي:
{
  "instagram": "...",
  "twitter": "...",
  "tiktok": "...",
  "snapchat": "..."
}`;
}

function buildFallbackCaptions(perfumeData: PerfumeData, productUrl: string) {
  const brand = perfumeData.brand?.replace(/\s/g, '') || 'mahwous';
  const notes = perfumeData.notes || 'نوتات ساحرة تأسر الحواس';
  const productLink = productUrl || 'https://mahwous.com';

  return {
    instagram: `✨ ${perfumeData.name} من ${perfumeData.brand}\n\nعطرٌ يُجسّد روح الفخامة ويُحكي قصة الأناقة الأصيلة ✨\n\n🌸 المكونات: ${notes}\n\n🛒 اطلب الآن:\n📞 واتساب: ${WHATSAPP_NUMBER}\n💬 ${WHATSAPP_LINK}\n🔗 المنتج: ${productLink}\n\n#${brand} #عطور_فاخرة #مهووس_للعطور #perfume #luxury #عطور_خليجية #عطور_رجالية #فخامة`,
    twitter: `✨ ${perfumeData.name} — ${perfumeData.brand}\n\nأناقةٌ لا تُنسى في كل رشّة 🌸\nمكونات: ${notes}\n\n🛒 للطلب: ${WHATSAPP_LINK}\n🔗 ${productLink}\n\n#عطور_فاخرة #${brand} #مهووس`,
    tiktok: `🔥 عطر ${perfumeData.name} من ${perfumeData.brand} — هذا اللي كنت تدور عليه!\n✨ رائحة تفرق وتبقى في الذاكرة\n🌸 ${notes}\n📦 اطلب الحين: ${WHATSAPP_LINK}\n#عطور #ترند #${brand} #مهووس_للعطور #fyp #foryou #عطور_فاخرة`,
    snapchat: `💛 ${perfumeData.name} وصل!\nرائحة فاخرة بسعر يناسبك 🌟\nاطلب الحين 👇\n${WHATSAPP_LINK}`,
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
    max_tokens: 1200,
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: 'أنت خبير تسويق عطور فاخر. أجب بـ JSON فقط بدون أي نص إضافي.',
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
    model: 'claude-3-5-haiku-20241022', // Haiku is faster and less likely to be overloaded
    max_tokens: 1200,
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

    // Try OpenAI first (more reliable, less overloaded)
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

    // Try Claude as secondary if OpenAI failed
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

    // If both failed, return static fallback immediately
    if (source === 'fallback') {
      console.log('[/api/captions] Using static fallback captions');
      return NextResponse.json({ captions: fallback, source: 'fallback' }, { status: 200 });
    }

    // Parse the AI response
    let captions = fallback;
    try {
      const clean = rawText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(clean);
      captions = {
        instagram: parsed.instagram || fallback.instagram,
        twitter: parsed.twitter || fallback.twitter,
        tiktok: parsed.tiktok || fallback.tiktok,
        snapchat: parsed.snapchat || fallback.snapchat,
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
