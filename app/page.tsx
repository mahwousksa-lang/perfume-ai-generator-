'use client';

import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowLeft, Loader2, Link2, Sparkles, Video, MessageSquare, Image, Copy, Check, Instagram, Twitter } from 'lucide-react';

import type {
  PerfumeData,
  GenerationResult,
  ScrapeResult,
  CaptionResult,
  AppStep,
  VideoScenario,
} from '@/lib/types';

import OutputGrid from '@/components/OutputGrid';
import ScenarioDisplay from '@/components/ScenarioDisplay';

// ─── TikTok Icon ─────────────────────────────────────────────────────────────
function TikTokIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  );
}

// ─── Snapchat Icon ────────────────────────────────────────────────────────────
function SnapchatIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.166 2C9.44 2 7.3 3.23 6.3 5.14c-.5.93-.6 1.9-.6 2.86v1.5c-.3.1-.6.14-.9.14-.5 0-.8-.1-1-.2l-.1-.05-.1.05c-.2.1-.3.3-.3.5 0 .4.4.7.9.9.1.05.2.05.3.1-.1.3-.4.6-.9.8-.5.2-.8.5-.8.9 0 .3.2.6.5.8.1.05.2.1.3.1.4.1.8.2 1.2.4.1.05.2.1.3.2.1.1.1.2.1.3-.1.2-.3.4-.5.6-.3.3-.6.7-.6 1.2 0 .9.8 1.6 2.2 1.9.1.3.2.7.5.9.2.1.4.2.7.2.3 0 .6-.1.9-.2.5-.2 1-.3 1.5-.3.5 0 1 .1 1.5.3.3.1.6.2.9.2.3 0 .5-.1.7-.2.3-.2.4-.6.5-.9 1.4-.3 2.2-1 2.2-1.9 0-.5-.3-.9-.6-1.2-.2-.2-.4-.4-.5-.6 0-.1 0-.2.1-.3.1-.1.2-.15.3-.2.4-.2.8-.3 1.2-.4.1 0 .2-.05.3-.1.3-.2.5-.5.5-.8 0-.4-.3-.7-.8-.9-.5-.2-.8-.5-.9-.8.1-.05.2-.05.3-.1.5-.2.9-.5.9-.9 0-.2-.1-.4-.3-.5l-.1-.05-.1.05c-.2.1-.5.2-1 .2-.3 0-.6-.04-.9-.14v-1.5c0-.96-.1-1.93-.6-2.86C16.7 3.23 14.56 2 12.166 2z"/>
    </svg>
  );
}

// ─── Caption Card Component ───────────────────────────────────────────────────
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
  const safeCaption = typeof caption === 'string' ? caption : String(caption ?? '');

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(safeCaption).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">{platform}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--obsidian-border)] text-[var(--text-muted)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'تم النسخ!' : 'نسخ'}
        </button>
      </div>
      <div className="bg-black/20 rounded-xl p-4 min-h-[80px]">
        <p className="caption-text text-sm whitespace-pre-wrap">{safeCaption}</p>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] text-right font-mono">
        {safeCaption.length} حرف
      </p>
    </div>
  );
}

// ─── Captions Section ─────────────────────────────────────────────────────────
function CaptionsSection({ captionResult }: { captionResult: CaptionResult }) {
  const captions = captionResult.captions as Record<string, string>;
  const instagram = typeof captions.instagram === 'string' ? captions.instagram : '';
  const twitter = typeof captions.twitter === 'string' ? captions.twitter : '';
  const tiktok = typeof captions.tiktok === 'string' ? captions.tiktok : '';
  const snapchat = typeof captions.snapchat === 'string' ? captions.snapchat : '';

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="gold-divider flex-1" />
        <p className="section-label mb-0 px-2">كابشنات السوشيال ميديا</p>
        <div className="gold-divider flex-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CaptionCard platform="Instagram" icon={Instagram} color="#E1306C" caption={instagram} />
        <CaptionCard platform="Twitter / X" icon={Twitter} color="#1DA1F2" caption={twitter} />
        {tiktok ? (
          <CaptionCard platform="TikTok" icon={TikTokIcon as React.ElementType} color="#010101" caption={tiktok} />
        ) : null}
        {snapchat ? (
          <CaptionCard platform="Snapchat" icon={SnapchatIcon as React.ElementType} color="#FFFC00" caption={snapchat} />
        ) : null}
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState<AppStep>('input');
  const [productUrl, setProductUrl] = useState<string>('');
  const [perfumeData, setPerfumeData] = useState<PerfumeData | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null);
  const [scenarios, setScenarios] = useState<VideoScenario[] | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'captions' | 'videos'>('images');
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const handleGenerateCampaign = async () => {
    if (!productUrl.trim()) {
      toast.error('الرجاء إدخال رابط المنتج أولاً.');
      return;
    }
    setStep('generating');

    try {
      // Step 1: Scrape
      setLoadingStatus('جاري استخراج معلومات المنتج...');
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      if (!scrapeRes.ok) {
        const err = await scrapeRes.json();
        throw new Error(err.error || 'فشل استخراج البيانات من الرابط.');
      }
      const scrapeData: ScrapeResult = await scrapeRes.json();
      const product: PerfumeData = {
        name: scrapeData.product.name ?? '',
        brand: scrapeData.product.brand ?? '',
        gender: (scrapeData.product.gender as PerfumeData['gender']) ?? 'unisex',
        notes: scrapeData.product.notes,
        description: scrapeData.product.description,
        imageUrl: scrapeData.product.imageUrl,
        price: scrapeData.product.price,
      };
      setPerfumeData(product);

      // Step 2: Generate images
      setLoadingStatus('جاري توليد الصور الاحترافية...');
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData: product,
          vibe: scrapeData.recommendation.vibe,
          attire: scrapeData.recommendation.attire,
        }),
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'فشل توليد الصور.');
      }
      const genData: GenerationResult = await genRes.json();
      setGenerationResult(genData);

      // Step 3: Generate captions
      setLoadingStatus('جاري كتابة الكابشنات الاحترافية...');
      const capRes = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData: product,
          vibe: scrapeData.recommendation.vibe,
          attire: scrapeData.recommendation.attire,
          productUrl: productUrl.trim(),
        }),
      });
      if (capRes.ok) {
        const capData: CaptionResult = await capRes.json();
        setCaptionResult(capData);
      }

      // Step 4: Generate video scenarios
      setLoadingStatus('جاري توليد سيناريوهات الفيديو...');
      const scenRes = await fetch('/api/generate-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData: product,
          vibe: scrapeData.recommendation.vibe,
        }),
      });
      if (scenRes.ok) {
        const scenData = await scenRes.json();
        setScenarios(scenData.scenarios);
      }

      setStep('output');
      toast.success('حملتك جاهزة! 🎉');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'حدث خطأ غير متوقع.';
      toast.error(errorMessage);
      setStep('input');
    }
  };

  const handleReset = () => {
    setStep('input');
    setProductUrl('');
    setPerfumeData(null);
    setGenerationResult(null);
    setCaptionResult(null);
    setScenarios(null);
    setActiveTab('images');
    setLoadingStatus('');
  };

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--text-primary)]" dir="rtl">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-[var(--obsidian-border)] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
              <Sparkles size={16} className="text-black" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[var(--text-primary)]">مهووس AI</h1>
              <p className="text-[10px] text-[var(--text-muted)]">مولّد الحملات الإعلانية</p>
            </div>
          </div>
          {step === 'output' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
            >
              <ArrowLeft size={14} />
              حملة جديدة
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ── INPUT STEP ── */}
        {step === 'input' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-[var(--gold)]">حملتك الإعلانية في ثوانٍ</h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                أدخل رابط أي عطر من متجر مهووس، وسيقوم الذكاء الاصطناعي بتوليد صور احترافية، كابشنات، وسيناريوهات فيديو ترند تلقائياً.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-3">
              <div className="relative">
                <Link2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="url"
                  className="luxury-input pr-10 text-sm w-full"
                  placeholder="https://mahwous.com/products/..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateCampaign()}
                  dir="ltr"
                />
              </div>
              <button
                onClick={handleGenerateCampaign}
                disabled={!productUrl.trim()}
                className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-40"
              >
                <Sparkles size={16} />
                ابدأ توليد الحملة
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)]">
              {['صور 3 أحجام', 'كابشن انستغرام + تويتر + تيك توك', 'سيناريو فيديو ترند', 'صوت عربي سعودي', 'واتساب تلقائي'].map((f) => (
                <span key={f} className="px-3 py-1 rounded-full border border-[var(--obsidian-border)] bg-[var(--obsidian-light)]">
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── GENERATING STEP ── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-[var(--gold)] border-t-transparent animate-spin" />
              <Sparkles size={24} className="absolute inset-0 m-auto text-[var(--gold)]" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-[var(--text-primary)]">جاري بناء حملتك...</p>
              <p className="text-sm text-[var(--text-muted)] animate-pulse">{loadingStatus}</p>
            </div>
          </div>
        )}

        {/* ── OUTPUT STEP ── */}
        {step === 'output' && (
          <div className="space-y-6">
            {/* Product info bar */}
            {perfumeData && (
              <div className="glass-card p-4 flex items-center gap-4">
                {perfumeData.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={perfumeData.imageUrl} alt={perfumeData.name} className="w-12 h-12 object-contain rounded-lg" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--text-primary)] truncate">{perfumeData.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{perfumeData.brand} · {perfumeData.price}</p>
                </div>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  حملة جاهزة
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[var(--obsidian-light)] rounded-xl">
              {[
                { id: 'images', label: 'الصور', icon: Image },
                { id: 'captions', label: 'الكابشنات', icon: MessageSquare },
                { id: 'videos', label: 'سيناريوهات الفيديو', icon: Video },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs rounded-lg transition-all ${
                    activeTab === id
                      ? 'bg-[var(--gold)] text-black font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'images' && generationResult && (
              <OutputGrid images={generationResult.images} perfumeName={perfumeData?.name ?? ''} />
            )}

            {activeTab === 'captions' && (
              captionResult ? (
                <CaptionsSection captionResult={captionResult} />
              ) : (
                <div className="glass-card p-8 text-center text-[var(--text-muted)]">
                  <p>جاري تحضير الكابشنات...</p>
                </div>
              )
            )}

            {activeTab === 'videos' && scenarios && (
              <ScenarioDisplay scenarios={scenarios} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
