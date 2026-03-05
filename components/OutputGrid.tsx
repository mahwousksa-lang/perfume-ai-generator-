'use client';

import { Download, Expand, Smartphone, Square, Monitor } from 'lucide-react';
import Image from 'next/image';
import type { GeneratedImage } from '@/lib/types';

interface OutputGridProps {
  images: GeneratedImage[];
  perfumeName: string;
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

export default function OutputGrid({ images, perfumeName }: OutputGridProps) {
  const handleDownload = async (url: string, format: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${perfumeName.replace(/\s/g, '-')}-${format}-campaign.webp`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="gold-divider flex-1" />
        <p className="section-label mb-0 px-2">الصور المُولَّدة</p>
        <div className="gold-divider flex-1" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {images.map((img, i) => {
          const Icon = FORMAT_ICONS[img.format] ?? Square;
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
                  alt={`${img.label} campaign image`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />

                {/* Hover overlay */}
                <div className="overlay gap-2">
                  <button
                    onClick={() => window.open(img.url, '_blank')}
                    className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2"
                  >
                    <Expand size={12} />
                    عرض
                  </button>
                  <button
                    onClick={() => handleDownload(img.url, img.format)}
                    className="btn-gold flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                  >
                    <Download size={12} />
                    تحميل
                  </button>
                </div>
              </div>

              {/* Label */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={13} className="text-[var(--gold)]" />
                  <span className="text-xs text-[var(--text-secondary)]">{img.label}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {img.dimensions.width}×{img.dimensions.height}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Download all */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => images.forEach((img) => handleDownload(img.url, img.format))}
          className="btn-ghost flex items-center gap-2 px-6 py-3 text-sm"
        >
          <Download size={14} />
          تحميل جميع الصور (3 صيغ)
        </button>
      </div>
    </div>
  );
}
