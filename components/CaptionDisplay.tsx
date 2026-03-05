'use client';

import { useState } from 'react';
import { Copy, Check, Instagram, Twitter } from 'lucide-react';

interface CaptionDisplayProps {
  instagram: string;
  twitter: string;
}

function CaptionCard({
  platform,
  icon: Icon,
  color,
  caption,
}: {
  platform: string;
  icon: React.ElementType;
  color: string;
  caption: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">{platform}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                     border border-[var(--obsidian-border)] text-[var(--text-muted)]
                     hover:border-[var(--gold)] hover:text-[var(--gold)]
                     transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'تم النسخ!' : 'نسخ'}
        </button>
      </div>

      {/* Caption */}
      <div className="bg-black/20 rounded-xl p-4 min-h-[80px]">
        <p className="caption-text text-sm whitespace-pre-wrap">{caption}</p>
      </div>

      {/* Char count */}
      <p className="text-[10px] text-[var(--text-muted)] text-right font-mono">
        {caption.length} حرف
      </p>
    </div>
  );
}

export default function CaptionDisplay({ instagram, twitter }: CaptionDisplayProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="gold-divider flex-1" />
        <p className="section-label mb-0 px-2">كابشنات السوشيال ميديا</p>
        <div className="gold-divider flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CaptionCard
          platform="Instagram"
          icon={Instagram}
          color="#E1306C"
          caption={instagram}
        />
        <CaptionCard
          platform="Twitter / X"
          icon={Twitter}
          color="#1DA1F2"
          caption={twitter}
        />
      </div>
    </div>
  );
}
