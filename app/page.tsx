'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Sparkles, FlaskConical, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import UrlScraper from '@/components/UrlScraper';
import VibeAttireSelector from '@/components/VibeAttireSelector';
import LoraConfig from '@/components/LoraConfig';
import OutputGrid from '@/components/OutputGrid';
import CaptionDisplay from '@/components/CaptionDisplay';
import type {
  PerfumeData,
  GeneratedImage,
  ScrapeResult,
  AppStep,
} from '@/lib/types';

const DEFAULT_PERFUME: PerfumeData = { name: '', brand: '', gender: 'men' };
type InputMode = 'url' | 'manual';

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [perfumeData, setPerfumeData] = useState<PerfumeData>(DEFAULT_PERFUME);
  const [vibe, setVibe] = useState('royal_luxury');
  const [attire, setAttire] = useState('white_thobe_black_bisht');

  const [bottleImageBase64, setBottleImageBase64] = useState<string | null>(null);
  const [bottleDescription, setBottleDescription] = useState<string | undefined>();

  // ── Fal.ai LoRA state (URL + trigger word) ──────────────────────────────────
  const [loraPath, setLoraPath] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_LORA_PATH ?? '',
  );
  const [loraTriggerWord, setLoraTriggerWord] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_LORA_TRIGGER ?? '',
  );

  const [appStep, setAppStep] = useState<AppStep>('input');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captions, setCaptions] = useState<{ instagram: string; twitter: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState('');

  const handleScrapeComplete = (result: ScrapeResult) => {
    const { product, recommendation } = result;
    setPerfumeData({
      name: product.name ?? '',
      brand: product.brand ?? '',
      gender: (product.gender as PerfumeData['gender']) ?? 'men',
      notes: product.notes ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl,
    });
    setVibe(recommendation.vibe);
    setAttire(recommendation.attire);
  };

  const handleGenerate = async () => {
    if (!perfumeData.name || !perfumeData.brand) {
      setError('الرجاء إدخال اسم العطر والماركة.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setAppStep('generating');
    setGeneratedImages([]);
    setCaptions(null);
    setProgressStep('Fal.ai FLUX-LoRA يبني المشهد ثلاثي الأبعاد...');

    try {
      // ── Step 1: Generate 3 images via Fal.ai ──────────────────────────────────
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData,
          vibe,
          attire,
          // ✅ loraPath: direct URL to .safetensors (Fal.ai format)
          loraPath: loraPath.trim() || undefined,
          // ✅ loraTriggerWord: injected FIRST in prompt inside buildPrompt()
          loraTriggerWord: loraTriggerWord.trim() || undefined,
          bottleImageBase64: bottleImageBase64 || undefined,
          bottleDescription: bottleDescription || undefined,
        }),
      });

      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? 'فشل توليد الصور');

      setGeneratedImages(genData.images);
      setPrompt(genData.prompt);
      setAppStep('output');

      // ── Step 2: Captions (non-blocking) ───────────────────────────────────────
      setGeneratingCaptions(true);
      const capRes = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfumeData, vibe, attire }),
      });
      const capData = await capRes.json();
      if (capRes.ok && capData.captions) setCaptions(capData.captions);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التوليد');
      setAppStep('input');
    } finally {
      setIsGenerating(false);
      setGeneratingCaptions(false);
      setProgressStep('');
    }
  };

  const handleReset = () => {
    setAppStep('input');
    setGeneratedImages([]);
    setCaptions(null);
    setError(null);
    setPrompt('');
  };

  return (
    <div className="min-h-screen">
      {/* Decorative BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)' }} />
        <div className="absolute bottom-[-10%] left-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #6430B4, transparent)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[var(--obsidian-border)] bg-[rgba(8,8,16,0.8)] backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--gold-muted)] border border-[var(--gold)]/30 flex items-center justify-center animate-pulse-gold">
              <FlaskConical size={18} className="text-[var(--gold)]" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-gold-shimmer">Perfume Brand AI</h1>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
                Powered by Fal.ai FLUX-LoRA
              </p>
            </div>
          </div>
          {appStep === 'output' && (
            <button onClick={handleReset} className="btn-ghost flex items-center gap-2 text-sm px-4 py-2">
              <RefreshCw size={13} />
              حملة جديدة
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* HERO */}
        {appStep === 'input' && (
          <div className="text-center mb-12 animate-fade-in-up">
            <p className="section-label mb-3">محرك الحملات الإبداعية</p>
            <h2 className="font-display text-5xl font-light mb-4 leading-tight">
              <span className="text-gold-shimmer">حوّل عطرك</span>
              <br />
              <span className="text-[var(--text-secondary)]">إلى حملة إعلانية استثنائية</span>
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              ذكاء اصطناعي متخصص يُولّد صورًا ثلاثية الأبعاد فاخرة مع شخصية ثابتة الملامح،
              وكابشنات عربية احترافية — في ثوانٍ.
            </p>
          </div>
        )}

        {/* GENERATING STATE */}
        {appStep === 'generating' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in-up">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border border-[var(--gold)]/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-[var(--gold)]/40 flex items-center justify-center animate-pulse-gold">
                  <FlaskConical size={28} className="text-[var(--gold)] animate-float" />
                </div>
              </div>
              <div className="loading-ring absolute inset-[-4px]" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-display text-2xl text-[var(--text-primary)]">جاري إنشاء الحملة...</p>
              <p className="text-sm text-[var(--text-muted)]">{progressStep}</p>
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: 'Story 9:16', icon: '📱' },
                { label: 'Post 1:1', icon: '🖼️' },
                { label: 'Landscape 16:9', icon: '🖥️' },
              ].map((item, i) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-card)] animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INPUT / OUTPUT LAYOUT */}
        {appStep !== 'generating' && (
          <div className={`grid gap-8 ${appStep === 'output' ? 'grid-cols-[380px,1fr]' : 'grid-cols-[420px,1fr]'}`}>

            {/* LEFT: Input Panel */}
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="glass-card p-1 flex rounded-2xl">
                {(['url', 'manual'] as InputMode[]).map((mode) => (
                  <button key={mode} onClick={() => setInputMode(mode)}
                    className={`segment-btn rounded-xl transition-all ${inputMode === mode ? 'active' : ''}`}>
                    {mode === 'url' ? '🔗 من رابط المنتج' : '✏️ إدخال يدوي'}
                  </button>
                ))}
              </div>

              {/* URL Mode */}
              {inputMode === 'url' && (
                <div className="glass-card p-5">
                  <UrlScraper onScrapeComplete={handleScrapeComplete} />
                  {perfumeData.name && (
                    <div className="mt-4 pt-4 border-t border-[var(--obsidian-border)] space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--gold)]">
                        <ChevronRight size={12} /><span>البيانات المستخرجة</span>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3 space-y-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{perfumeData.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{perfumeData.brand}</p>
                        {perfumeData.notes && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 font-arabic">{perfumeData.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Mode */}
              {inputMode === 'manual' && (
                <div className="glass-card p-5 space-y-4">
                  <p className="section-label">بيانات العطر</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-1.5 block">اسم العطر *</label>
                      <input type="text" className="luxury-input" placeholder="مثال: Bleu de Chanel"
                        value={perfumeData.name}
                        onChange={(e) => setPerfumeData((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-1.5 block">الماركة *</label>
                      <input type="text" className="luxury-input" placeholder="مثال: Chanel"
                        value={perfumeData.brand}
                        onChange={(e) => setPerfumeData((p) => ({ ...p, brand: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-1.5 block">الجنس</label>
                      <select className="luxury-input" value={perfumeData.gender ?? 'men'}
                        onChange={(e) => setPerfumeData((p) => ({ ...p, gender: e.target.value as PerfumeData['gender'] }))}>
                        <option value="men">للرجال</option>
                        <option value="women">للنساء</option>
                        <option value="unisex">للجنسين</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-1.5 block">الملاحظات العطرية</label>
                      <input type="text" className="luxury-input" placeholder="مثال: عود، مسك، ورد، عنبر..."
                        value={perfumeData.notes ?? ''}
                        onChange={(e) => setPerfumeData((p) => ({ ...p, notes: e.target.value }))}
                        dir="rtl" />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottle image */}
              <div className="glass-card p-5">
                <ImageUpload
                  onImageChange={(base64, desc) => {
                    setBottleImageBase64(base64);
                    setBottleDescription(desc);
                  }}
                  perfumeName={perfumeData.name}
                  brandName={perfumeData.brand}
                />
              </div>

              {/* Vibe & Attire */}
              <div className="glass-card p-5">
                <VibeAttireSelector vibe={vibe} attire={attire}
                  onVibeChange={setVibe} onAttireChange={setAttire} />
              </div>

              {/* LoRA config — now uses loraPath (URL) */}
              <LoraConfig
                loraPath={loraPath}
                loraTriggerWord={loraTriggerWord}
                onLoraPathChange={setLoraPath}
                onTriggerWordChange={setLoraTriggerWord}
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !perfumeData.name || !perfumeData.brand}
                className="btn-gold w-full flex items-center justify-center gap-3 text-base py-5 rounded-2xl"
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" />جاري التوليد...</>
                ) : (
                  <><Sparkles size={18} />توليد الحملة الإعلانية</>
                )}
              </button>

              <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                يتم توليد 3 صور بالتوازي (Story · Post · Landscape)
                <br />
                عبر <strong className="text-[var(--gold)]">Fal.ai FLUX-LoRA</strong> — قد يستغرق 60–120 ثانية
              </p>
            </div>

            {/* RIGHT: Output */}
            <div className="space-y-8">
              {appStep === 'input' && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 opacity-40">
                  <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-[var(--obsidian-border)] flex items-center justify-center">
                    <FlaskConical size={40} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm text-[var(--text-muted)]">ستظهر الصور المُولَّدة هنا</p>
                    <p className="text-xs text-[var(--text-muted)]">أدخل بيانات العطر واضغط توليد</p>
                  </div>
                </div>
              )}

              {appStep === 'output' && (
                <>
                  {generatedImages.length > 0 && (
                    <OutputGrid images={generatedImages} perfumeName={perfumeData.name} />
                  )}

                  {prompt && (
                    <details className="glass-card p-4">
                      <summary className="cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors select-none">
                        عرض البرومبت المُستخدم ▾
                      </summary>
                      <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed font-mono break-all" dir="ltr">
                        {prompt}
                      </p>
                    </details>
                  )}

                  {generatingCaptions && !captions && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
                      <Loader2 size={14} className="animate-spin text-[var(--gold)]" />
                      Claude يكتب الكابشنات العربية...
                    </div>
                  )}

                  {captions && (
                    <CaptionDisplay instagram={captions.instagram} twitter={captions.twitter} />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-[var(--obsidian-border)] mt-20 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Powered by Fal.ai FLUX-LoRA · Anthropic Claude · Google Gemini · Next.js
          </p>
          <p className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} Perfume Brand AI</p>
        </div>
      </footer>
    </div>
  );
}
