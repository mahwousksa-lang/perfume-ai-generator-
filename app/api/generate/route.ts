import { NextRequest, NextResponse } from 'next/server';
import { generateImages } from '@/lib/falClient'; // تأكد أن الاستيراد من falClient وليس replicateClient
import type { GenerationRequest } from '@/lib/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    if (!body.perfumeData?.name?.trim() || !body.perfumeData?.brand?.trim()) {
      return NextResponse.json(
        { error: 'perfumeData.name and perfumeData.brand are required.' },
        { status: 400 }
      );
    }
    
    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const result = await generateImages(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    console.error('[/api/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
