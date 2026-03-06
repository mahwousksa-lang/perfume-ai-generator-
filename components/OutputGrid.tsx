'use client';

// ============================================================
// components/OutputGrid.tsx
// Displays the 3 generated images with safe download handling.
//
// CORS FIX:
// fal.media URLs block cross-origin fetch() calls which causes
// Next.js Application Error crash. Solution: open images in a
// new tab using window.open() — zero CORS issues, zero crashes.
//
// For download: we use an <a> tag with download attribute +
// the raw URL. For cross-origin images (fal.media), we fall
// back to window.open which lets the browser handle it natively.
// ============================================================

import { Download, Expand, Smartphone, Square, Monitor, Send } from 'lucide-react';
import Image from 'next/image';
import type { GeneratedImage } from '@/lib/types';

interface OutputGridProps {
  images: GeneratedImage[];
  perfumeName?: string;
}

const FORMAT_ICONS: Record<string, React.ElementType> = {
  story: Smartphone,
  post: Square,
  landscape: Monitor,
};

const FORMAT_ASPECT: Record<string, string> = {
  story: 'aspect-[9/16]',
  post: 'aspect-square',
  landscape: 'aspect-video',
};

// Platforms that receive each format
const FORMAT_PLATFORMS: Record<string, string> = {
  story: 'Snapchat · TikTok · Instagram Story · Facebook Story · WhatsApp · YouTube Shorts',
  post: 'Instagram Post · Facebook · Pinterest',
  landscape: 'LinkedIn · YouTube',
};

// ─── Safe download — no CORS crash ────────────────────────────────────────────
//
// Strategy:
//  1. Try creating a proxy download link (works for same-origin or CORS-enabled)
//  2. If that fails (fal.media blocks it), silently fall through to window.open
//  3. window.open NEVER crashes the app — browser handles it natively
//
function safeDownload(url: string, filename: string): void {
  // For data URLs (from Gemini), use direct download
  if (url.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // For fal.media and other CDN URLs, skip fetch entirely
  // and use window.open for a reliable zero-crash experience
  const isCrossDomain =
    url.includes('fal.media') ||
    url.includes('fal.run') ||
    url.includes('cdn.') ||
    !url.startsWith('/');

  if (isCrossDomain) {
    // Open in new tab — user can right-click → Save Image
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // Same-origin: direct download link
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OutputGrid({ images, perfumeName = 'perfume' }: OutputGridProps) {
  const safeName = (perfumeName || 'perfume').replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="gold-divider flex-1" />
        <p className="section-label mb-0 px-2">الصور المُولَّدة — 3 صيغ</p>
        <div className="gold-divider flex-1" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {images.map((img, i) => {
          const Icon = FORMAT_ICONS[img.format] ?? Square;
          const filename = `mahwous-${safeName}-${img.format}.jpg`;
          const platforms = FORMAT_PLATFORMS[img.format] ?? '';

          return (
            <div
              key={img.format}
              className="output-card animate-fade-in-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {/* Image */}
              <div className={`relative w-full ${FORMAT_ASPECT[img.format]} bg-[var(--obsidian)]`}>
                <Image
                  src={img.url}
                  alt={`${img.label} campaign image for ${perfumeName}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />

                {/* Hover overlay — safe window.open only */}
                <div className="overlay gap-2">
                  <button
                    onClick={() => window.open(img.url, '_blank', 'noopener,noreferrer')}
                    className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2"
                    title="فتح الصورة في نافذة جديدة"
                  >
                    <Expand size={12} />
                    عرض
                  </button>
                  <button
                    onClick={() => safeDownload(img.url, filename)}
                    className="btn-gold flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                    title="تحميل الصورة"
                  >
                    <Download size={12} />
                    تحميل
                  </button>
                </div>
              </div>

              {/* Label + platforms */}
              <div className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-[var(--gold)]" />
                    <span className="text-xs text-[var(--text-secondary)]">{img.label}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {img.dimensions.width}×{img.dimensions.height}
                  </span>
                </div>
                <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">{platforms}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Open all */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() =>
            images.forEach((img) => window.open(img.url, '_blank', 'noopener,noreferrer'))
          }
          className="btn-ghost flex items-center gap-2 px-6 py-3 text-sm"
        >
          <Send size={14} />
          فتح جميع الصور (3 صيغ)
        </button>
      </div>

      {/* CORS notice */}
      <p className="text-[10px] text-[var(--text-muted)] text-center">
        💡 بعد فتح الصورة في المتصفح، انقر بالزر الأيمن واختر «حفظ الصورة» للتنزيل
      </p>
    </div>
  );
}
