// ============================================================
// app/api/captions/route.ts
// POST /api/captions
// Generates Arabic social media captions.
// Primary: Claude | Fallback: OpenAI (auto-switch on overload)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { PerfumeData } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = '+966553964135';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

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
- الوصف: ${perfumeData.description?.substring(0, 400) || 'لا يوجد'}
- الأجواء: ${vibe.replace(/_/g, ' ')}
- الزي: ${attire.replace(/_/g, ' ')}

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

أجب بـ JSON فقط:
{
  "instagram": "...",
  "twitter": "...",
  "tiktok": "...",
  "snapchat": "..."
}`;
}

function buildFallbackCaptions(perfumeData: PerfumeData, productUrl: string) {
  const brand = perfumeData.brand?.replace(/\s/g, '') || 'mahwous';
  return {
    instagram: `✨ ${perfumeData.name} من ${perfumeData.brand}\nعطرٌ يُجسّد روح الفخامة ويُحكي قصة الأناقة الأصيلة.\n🌸 المكونات: ${perfumeData.notes || 'نوتات ساحرة تأسر الحواس'}\n\n🛒 اطلب الآن:\n📞 واتساب: ${WHATSAPP_NUMBER}\n🔗 ${WHATSAPP_LINK}\n\n#${brand} #عطور_فاخرة #مهووس_للعطور #perfume #luxury #عطور_خليجية`,
    twitter: `✨ ${perfumeData.name} — ${perfumeData.brand}\nأناقةٌ لا تُنسى في كل رشّة 🌸\n🛒 للطلب: ${WHATSAPP_LINK}\n#عطور_فاخرة #${brand} #مهووس`,
    tiktok: `🔥 عطر ${perfumeData.name} من ${perfumeData.brand} — هذا اللي كنت تدور عليه!\n✨ رائحة تفرق وتبقى في الذاكرة\n📦 اطلب الحين: ${WHATSAPP_LINK}\n#عطور #ترند #${brand} #مهووس_للعطور #fyp #foryou`,
    snapchat: `💛 ${perfumeData.name} وصل!\nرائحة فاخرة بسعر يناسبك 🌟\nاطلب الحين 👇\n${WHATSAPP_LINK}`,
  };
}

async function callClaude(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
}

async function callOpenAI(prompt: string): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content?.trim() ?? '{}';
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

    // Try Claude first, fall back to OpenAI on overload/error
    try {
      rawText = await callClaude(prompt);
    } catch (claudeError: any) {
      console.warn('[/api/captions] Claude failed, trying OpenAI fallback:', claudeError?.message);
      try {
        rawText = await callOpenAI(prompt);
      } catch (openaiError: any) {
        console.warn('[/api/captions] OpenAI also failed, using static fallback:', openaiError?.message);
        return NextResponse.json({ captions: fallback }, { status: 200 });
      }
    }

    let captions = fallback;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
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

    return NextResponse.json({ captions }, { status: 200 });
  } catch (error: unknown) {
    console.error('[/api/captions] Error:', error);
    const message = error instanceof Error ? error.message : 'Caption generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
