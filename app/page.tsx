'use client';

import { useState, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowLeft, Loader2, Link2, Sparkles, Video, Image, Upload, X } from 'lucide-react';

import type {
  PerfumeData,
  GenerationResult,
  CaptionResult,
  ScrapeResult,
  AppStep,
  VideoScenario,
  PlatformCaptions,
} from '@/lib/types';

import OutputGrid from '@/components/OutputGrid';
import ScenarioDisplay from '@/components/ScenarioDisplay';

// ─── Main App Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState<AppStep>('input');
  const [productUrl, setProductUrl] = useState<string>('');
  const [perfumeData, setPerfumeData] = useState<PerfumeData | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null);
  const [scenarios, setScenarios] = useState<VideoScenario[] | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  // ── Product reference image upload state ──────────────────────────────────
  const [bottleImageBase64, setBottleImageBase64] = useState<string>('');
  const [bottleImagePreview, setBottleImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBottleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBottleImageBase64(base64);
      setBottleImagePreview(base64);
      toast.success('تم رفع صورة المنتج المرجعية بنجاح');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBottleImage = () => {
    setBottleImageBase64('');
    setBottleImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      // Step 2: Generate images — Gemini Nano Banana (primary) + FLUX LoRA (fallback)
      setLoadingStatus('جاري توليد الصور بأسلوب نانو بنانا...');

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData: product,
          vibe: scrapeData.recommendation.vibe,
          attire: scrapeData.recommendation.attire,
          bottleImageBase64: bottleImageBase64 || undefined,
        }),
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'فشل توليد الصور.');
      }
      const genData = await genRes.json();

      let completedImages: Array<{
        format: 'story' | 'post' | 'landscape';
        label: string;
        dimensions: { width: number; height: number };
        url: string;
        aspectRatio: string;
      }> = [];

      if (genData.status === 'completed' && genData.images) {
        completedImages = genData.images.map((img: {
          format: string;
          label: string;
          dimensions: { width: number; height: number };
          url: string;
          aspectRatio: string;
        }) => ({
          format: img.format as 'story' | 'post' | 'landscape',
          label: img.label,
          dimensions: img.dimensions,
          url: img.url,
          aspectRatio: img.aspectRatio,
        }));
      } else if (genData.pendingImages) {
        // Legacy fal.ai polling mode (fallback)
        let pendingImages = genData.pendingImages;
        const maxPolls = 60;
        let pollCount = 0;

        while (pendingImages && pendingImages.length > 0 && pollCount < maxPolls) {
          setLoadingStatus(`جاري توليد الصور... (${pollCount * 3}ث)`);
          await new Promise((r) => setTimeout(r, 3000));

          const pollRes = await fetch('/api/poll-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingImages }),
          });

          if (!pollRes.ok) { pollCount++; continue; }
          const pollData = await pollRes.json();

          for (const result of pollData.results) {
            if (result.status === 'COMPLETED' && result.imageUrl) {
              const fmt = result.format as 'story' | 'post' | 'landscape';
              completedImages.push({
                format: fmt,
                label: result.label,
                dimensions: result.dimensions,
                url: result.imageUrl,
                aspectRatio: fmt === 'story' ? '9:16' : fmt === 'post' ? '1:1' : '16:9',
              });
            }
          }

          pendingImages = pollData.results.filter(
            (r: { status: string }) => r.status !== 'COMPLETED' && r.status !== 'FAILED'
          );

          if (pollData.allCompleted) break;
          pollCount++;
        }
      }

      if (completedImages.length === 0) {
        throw new Error('فشل توليد الصور. يرجى المحاولة مرة أخرى.');
      }

      const finalGenData: GenerationResult = {
        images: completedImages,
        prompt: genData.prompt || '',
        negativePrompt: '',
      };
      setGenerationResult(finalGenData);

      // Step 3: Generate captions for ALL platforms (runs in parallel with display)
      setLoadingStatus('جاري كتابة الكابشنات لجميع المنصات...');
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
      toast.success('حملتك جاهزة لجميع المنصات! 🎉');
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
    setBottleImageBase64('');
    setBottleImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
                أدخل رابط أي عطر من متجر مهووس، وسيقوم الذكاء الاصطناعي بتوليد صور احترافية بأسلوب نانو بنانا مع كابشنات مخصصة لـ 15 منصة سوشال ميديا.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-4">
              {/* Product URL Input */}
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

              {/* ── Product Reference Image Upload ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Upload size={12} />
                  <span>صورة المنتج المرجعية (اختياري — لضمان دقة شكل الزجاجة 100%)</span>
                </div>

                {!bottleImagePreview ? (
                  <label
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--obsidian-border)] rounded-xl cursor-pointer hover:border-[var(--gold)] hover:bg-[var(--obsidian-light)] transition-all group"
                  >
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors">
                      <Upload size={24} />
                      <span className="text-xs">اسحب صورة المنتج هنا أو اضغط للاختيار</span>
                      <span className="text-[10px] opacity-60">JPG, PNG, WEBP — حتى 10 ميجابايت</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBottleImageUpload}
                    />
                  </label>
                ) : (
                  <div className="relative w-full rounded-xl border border-[var(--gold)] bg-[var(--obsidian-light)] p-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={bottleImagePreview}
                        alt="صورة المنتج المرجعية"
                        className="w-20 h-20 object-contain rounded-lg bg-white/5"
                      />
                      <div className="flex-1 text-right">
                        <p className="text-xs text-[var(--gold)] font-medium">صورة المنتج المرجعية</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          سيتم استخدام هذه الصورة كمرجع لشكل الزجاجة الحقيقي
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveBottleImage}
                        className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                        title="إزالة الصورة"
                      >
                        <X size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateCampaign}
                disabled={!productUrl.trim()}
                className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-40"
              >
                <Sparkles size={16} />
                {bottleImageBase64 ? 'ابدأ التوليد (مع صورة مرجعية)' : 'ابدأ توليد الحملة'}
              </button>

              {bottleImageBase64 && (
                <p className="text-[10px] text-[var(--gold)] text-center animate-pulse">
                  سيتم استخدام الصورة المرجعية لضمان دقة شكل الزجاجة 100%
                </p>
              )}
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)]">
              {[
                '3 صور بأسلوب نانو بنانا',
                '15 منصة سوشال ميديا',
                'كابشن مخصص لكل منصة',
                'صورة مرجعية للمنتج',
                'سيناريو فيديو ترند',
                'حراج + تلقرام + تروث',
              ].map((f) => (
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
              {bottleImageBase64 && (
                <p className="text-[10px] text-[var(--gold)]">
                  يتم استخدام الصورة المرجعية لتوليد الزجاجة بشكلها الحقيقي
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── OUTPUT STEP ── */}
        {step === 'output' && generationResult && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Product Info */}
            {perfumeData && (
              <div className="glass-card p-4 flex items-center gap-4">
                {perfumeData.imageUrl && (
                  <img
                    src={perfumeData.imageUrl}
                    alt={perfumeData.name}
                    className="w-16 h-16 object-contain rounded-lg bg-black/20"
                  />
                )}
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{perfumeData.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{perfumeData.brand}</p>
                  {perfumeData.price && (
                    <p className="text-xs text-[var(--gold)]">{perfumeData.price}</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab Navigation — 2 tabs only: الصور + الفيديو */}
            <div className="flex gap-1 p-1 bg-[var(--obsidian-light)] rounded-xl">
              {[
                { key: 'images', label: 'الصور والكابشنات', icon: Image },
                { key: 'videos', label: 'الفيديو', icon: Video },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'images' | 'videos')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === key
                      ? 'bg-[var(--gold)] text-black'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Images + Captions Tab — merged into one */}
            {activeTab === 'images' && (
              <OutputGrid
                images={generationResult.images}
                captions={(captionResult?.captions as PlatformCaptions) || null}
                perfumeName={perfumeData?.name}
              />
            )}

            {/* Videos Tab */}
            {activeTab === 'videos' && scenarios && (
              <ScenarioDisplay scenarios={scenarios} />
            )}
            {activeTab === 'videos' && !scenarios && (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <Loader2 size={24} className="animate-spin mx-auto mb-3" />
                <p>جاري توليد السيناريوهات...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
