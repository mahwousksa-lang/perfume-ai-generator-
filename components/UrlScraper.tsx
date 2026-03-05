'use client';

import { useState } from 'react';
import { Link, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { ScrapeResult } from '@/lib/types';

interface UrlScraperProps {
  onScrapeComplete: (result: ScrapeResult) => void;
}

export default function UrlScraper({ onScrapeComplete }: UrlScraperProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setStatus('جاري جلب صفحة المنتج...');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'فشل في جلب الصفحة');
      }

      setStatus('Claude يحلل المنتج ويختار الأجواء المثالية...');
      await new Promise((r) => setTimeout(r, 800)); // UX delay for feel

      onScrapeComplete(data as ScrapeResult);
      setStatus('✓ تم تحليل المنتج وملء البيانات تلقائيًا');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-[var(--gold)]" />
        <p className="section-label mb-0">استيراد من رابط المنتج</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="url"
            className="luxury-input pl-9 text-sm"
            placeholder="https://mahwous.com/products/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            dir="ltr"
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={!url.trim() || isLoading}
          className="btn-gold px-5 py-3 text-xs whitespace-nowrap flex items-center gap-2 rounded-xl disabled:opacity-40"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isLoading ? '...' : 'تحليل'}
        </button>
      </div>

      {/* Status / Error */}
      {status && !error && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {isLoading && <Loader2 size={11} className="animate-spin text-[var(--gold)] shrink-0" />}
          <span>{status}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
