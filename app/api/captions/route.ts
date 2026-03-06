// ============================================================
// app/api/captions/route.ts
// POST /api/captions
// Generates Arabic social media captions using Claude,
// customized to the perfume's notes, brand, and selected vibe.
// Includes WhatsApp number and product link.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { PerfumeData } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CaptionRequest {
  perfumeData: PerfumeData;
  vibe: string;
  attire: string;
  productUrl: string;
}

const WHATSAPP_NUMBER = '+966553964135';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

export async function POST(request: NextRequest) {
  try {
    const { perfumeData, vibe, attire, productUrl }: CaptionRequest = await request.json();

    if (!perfumeData?.name) {
      return NextResponse.json({ error: 'perfumeData.name is required.' }, { status: 400 });
    }

    const genderLabel =
      perfumeData.gender === 'men'
        ? 'للرجال'
        : perfumeData.gender === 'women'
          ? 'للنساء'
          : 'للجنسين';

    const prompt = `أنت خبير تسويق عطور فاخر متخصص في السوق الخليجي والعربي. مهمتك كتابة محتوى تسويقي احترافي ومؤثر باللغة العربية الفصحى المعاصرة.

معلومات العطر:
- الاسم: ${perfumeData.name}
- الماركة: ${perfumeData.brand}
- المستخدم: ${genderLabel}
- المكونات العطرية: ${perfumeData.notes || 'غير محدد'}
- الوصف: ${perfumeData.description?.substring(0, 400) || 'لا يوجد'}
- الأجواء المختارة: ${vibe.replace(/_/g, ' ')}
- الزي المختار: ${attire.replace(/_/g, ' ')}

معلومات إضافية:
- رقم الواتساب للطلب: ${WHATSAPP_NUMBER}
- رابط واتساب مباشر: ${WHATSAPP_LINK}
- رابط المنتج: ${productUrl}

المطلوب: أنشئ كابشن احترافيًا لكل منصة. اجعل النص شعريًا وفاخرًا، يعكس هوية العطر تمامًا.

قواعد مهمة:
- انستغرام: 150-250 حرف، يبدأ بجملة شعرية جذابة، يتضمن 5-8 هاشتاقات عربية ذات صلة، إيموجيات أنيقة. يجب أن يتضمن رابط المنتج ورقم الواتساب.
- تويتر: 200-250 حرف, مباشر ومؤثر, 3-5 هاشتاقات, إيموجيات. يجب أن يتضمن رابط المنتج ورقم الواتساب.
- الهاشتاقات يجب أن تشمل: اسم الماركة، كلمات عن العطور، والسوق الخليجي.

أجب بـ JSON فقط بدون أي نص إضافي أو markdown:
{
  "instagram": "النص الكامل هنا",
  "twitter": "النص الكامل هنا"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

    let captions = {
      instagram: `✨ ${perfumeData.name} من ${perfumeData.brand}\nعطرٌ يُجسّد روح الفخامة ويُحكي قصة الأناقة الأصيلة.\n🌸 المكونات: ${perfumeData.notes || 'نوتات ساحرة تأسر الحواس'}\n\nللطلب والاستفسار:\n📞 واتساب: ${WHATSAPP_NUMBER}\n🔗 ${WHATSAPP_LINK}\n\n#${perfumeData.brand?.replace(/\s/g, '')} #عطور_فاخرة #عطور_نسائية #perfume #luxury`,
      twitter: `✨ ${perfumeData.name} — ${perfumeData.brand}\nأناقةٌ لا تُنسى في كل رشّة 🌸\nللطلب: ${WHATSAPP_LINK}\n#عطور_فاخرة #${perfumeData.brand?.replace(/\s/g, '')}`,
    };

    try {
      // Strip potential code fences
      const clean = rawText.replace(/```json|```/g, '').trim();
      captions = JSON.parse(clean);
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
