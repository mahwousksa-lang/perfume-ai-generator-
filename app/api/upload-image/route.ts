// ============================================================
// /api/upload-image — رفع صورة base64 والحصول على URL عام
// يستخدم imgbb.com API (مجاني) أو يحول إلى blob URL مؤقت
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, name } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    // إزالة prefix الـ data URI
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // ── الطريقة 1: imgbb.com (مجاني — 32MB max) ──
    if (IMGBB_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Data);
        if (name) formData.append('name', name);

        const res = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const publicUrl = data?.data?.url || data?.data?.display_url;
          if (publicUrl) {
            console.log(`[upload-image] imgbb SUCCESS: ${publicUrl}`);
            return NextResponse.json({ url: publicUrl, provider: 'imgbb' });
          }
        }
      } catch (err) {
        console.warn('[upload-image] imgbb failed:', err);
      }
    }

    // ── الطريقة 2: freeimage.host (بديل مجاني بدون API key) ──
    try {
      const formData = new FormData();
      formData.append('key', '6d207e02198a847aa98d0a2a901485a5'); // Public API key
      formData.append('source', base64Data);
      formData.append('format', 'json');

      const res = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const publicUrl = data?.image?.url || data?.image?.display_url;
        if (publicUrl) {
          console.log(`[upload-image] freeimage SUCCESS: ${publicUrl}`);
          return NextResponse.json({ url: publicUrl, provider: 'freeimage' });
        }
      }
    } catch (err) {
      console.warn('[upload-image] freeimage failed:', err);
    }

    // ── الطريقة 3: إرجاع base64 كما هو (fallback) ──
    console.warn('[upload-image] All providers failed, returning base64');
    return NextResponse.json({ 
      url: imageBase64, 
      provider: 'base64_fallback',
      warning: 'لم يتم رفع الصورة — Instagram لن يقبل هذا الرابط. أضف IMGBB_API_KEY في .env'
    });

  } catch (error) {
    console.error('[upload-image] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
