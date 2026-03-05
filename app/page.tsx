'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Sparkles, FlaskConical, Loader2, RefreshCw, ChevronRight, Send, CheckCircle } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import UrlScraper from '@/components/UrlScraper';
import VibeAttireSelector from '@/components/VibeAttireSelector';
import LoraConfig from '@/components/LoraConfig';
import OutputGrid from '@/components/OutputGrid';
import CaptionDisplay from '@/components/CaptionDisplay';
import type { PerfumeData, GeneratedImage, ScrapeResult, AppStep } from '@/lib/types';

const DEFAULT_PERFUME: PerfumeData = { name: '', brand: '', gender: 'men' };
type InputMode = 'url' | 'manual';
type SendStatus = 'idle' | 'sending' | 'success' | 'error';

export default function Home() {
  // ── Core state ────────────────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [perfumeData, setPerfumeData] = useState<PerfumeData>(DEFAULT_PERFUME);
  const [productUrl, setProductUrl] = useState('');
  const [vibe, setVibe] = useState('royal_luxury');
  const [attire, setAttire] = useState('white_thobe_black_bisht');

  const [bottleImageBase64, setBottleImageBase64] = useState<string | null>(null);
  const [bottleDescription, setBottleDescription] = useState<string | undefined>();

  const [loraPath, setLoraPath] = useState(process.env.NEXT_PUBLIC_DEFAULT_LORA_PATH ?? '');
  const [loraTriggerWord, setLoraTriggerWord] = useState(process.env.NEXT_PUBLIC_DEFAULT_LORA_TRIGGER ?? '');

  const [appStep, setAppStep] = useState<AppStep>('input');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captions, setCaptions] = useState<{ instagram: string; twitter: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState('');

  // ── Make.com send state ───────────────────────────────────────────────────────
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sendMessage, setSendMessage] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('+966xxxxxxxxx');

  // ─── Scrape handler ───────────────────────────────────────────────────────────
  const handleScrapeComplete = (result: ScrapeResult) => {
    const { product, recommendation } = result;
    setPerfumeData({
      name: product.name ?? '',
      brand: product.brand ?? '',
      gender: (product.gender as PerfumeData['gender']) ?? 'men',
      notes: product.notes ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl,
      price: product.price,
    });
    setVibe(recommendation.vibe);
    setAttire(recommendation.attire);
  };

  // ─── Generate handler ─────────────────────────────────────────────────────────
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
    setSendStatus('idle');
    setSendMessage('');
    setProgressStep('Fal.ai FLUX-LoRA يبني المشهد ثلاثي الأبعاد...');

    try {
      // Step 1: Generate images
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData,
          vibe,
          attire,
          loraPath: loraPath.trim() || undefined,
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

      // Step 2: Captions (non-blocking)
      setGeneratingCaptions(true);
      const capRes = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData,
          vibe,
          attire,
          productUrl: productUrl || undefined,
          whatsappNumber: whatsappNumber || undefined,
        }),
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

  // ─── Send to Make.com handler ─────────────────────────────────────────────────
  const handleSendToMake = async () => {
    if (!generatedImages.length || !captions) return;

    setSendStatus('sending');
    setSendMessage('');

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: generatedImages,
          captions,
          perfumeData: {
            ...perfumeData,
            productUrl: productUrl || 'https://mahwous.com/products',
          },
          whatsappNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'فشل الإرسال');

      setSendStatus('success');
      setSendMessage(
        data.mode === 'preview'
          ? '✅ وضع المعاينة — أضف MAKE_WEBHOOK_URL في متغيرات البيئة للإرسال الفعلي'
          : `✅ ${data.message} — ${data.platforms?.length ?? 8} منصة`,
      );
    } catch (err) {
      setSendStatus('error');
      setSendMessage(err instanceof Error ? err.message : 'فشل الإرسال');
    }
  };

  const handleReset = () => {
    setAppStep('input');
    setGeneratedImages([]);
    setCaptions(null);
    setError(null);
    setPrompt('');
    setSendStatus('idle');
    setSendMessage('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
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
              <h1 className="font-display text-xl font-semibold text-gold-shimmer">مهووس | Mahwous AI</h1>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
                Powered by Fal.ai · Claude · Make.com
              </p>
            </div>
          </div>
          {appStep === 'output' && (
            <button onClick={handleReset} className="btn-ghost flex items-center gap-2 text-sm px-4 py-2">
              <RefreshCw size={13} />حملة جديدة
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* HERO */}
        {appStep === 'input' && (
          <div className="text-center mb-12 animate-fade-in-up">
            <p className="section-label mb-3">وكالة إعلانية مؤتمتة</p>
            <h2 className="font-display text-5xl font-light mb-4 leading-tight">
              <span className="text-gold-shimmer">حوّل عطرك</span>
              <br />
              <span className="text-[var(--text-secondary)]">إلى حملة على 8 منصات</span>
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              صور 3D كرتونية فاخرة · كابشنات بيعية عربية · نشر تلقائي عبر Make.com
            </p>
          </div>
        )}

        {/* GENERATING */}
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
                { label: 'Story 9:16', icon: '📱', platforms: 'Snap · TikTok · Reels' },
                { label: 'Post 1:1', icon: '🖼️', platforms: 'Instagram · Pinterest' },
                { label: 'Landscape 16:9', icon: '🖥️', platforms: 'LinkedIn · YouTube' },
              ].map((item, i) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-card)] animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-[9px] text-[var(--gold)]/60">{item.platforms}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN LAYOUT */}
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

              {/* URL mode */}
              {inputMode === 'url' && (
                <div className="glass-card p-5 space-y-3">
                  <UrlScraper onScrapeComplete={(result) => {
                    handleScrapeComplete(result);
                    // Capture the URL for caption generation
                  }} />
                  {/* Product URL for captions */}
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">رابط المنتج (للكابشن)</label>
                    <input type="url" className="luxury-input text-sm" placeholder="https://mahwous.com/products/..."
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      dir="ltr" />
                  </div>
                  {perfumeData.name && (
                    <div className="pt-3 border-t border-[var(--obsidian-border)] space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--gold)]">
                        <ChevronRight size={12} /><span>البيانات المستخرجة</span>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3 space-y-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{perfumeData.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{perfumeData.brand}</p>
                        {perfumeData.price && (
                          <p className="text-xs text-[var(--gold)]">💰 {perfumeData.price}</p>
                        )}
                        {perfumeData.notes && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2">{perfumeData.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {inputMode === 'manual' && (
                <div className="glass-card p-5 space-y-3">
                  <p className="section-label">بيانات العطر</p>
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
                  <div className="grid grid-cols-2 gap-3">
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
                      <label className="text-xs text-[var(--text-muted)] mb-1.5 block">السعر</label>
                      <input type="text" className="luxury-input" placeholder="مثال: 250 ريال"
                        value={perfumeData.price ?? ''}
                        onChange={(e) => setPerfumeData((p) => ({ ...p, price: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">الملاحظات العطرية</label>
                    <input type="text" className="luxury-input" placeholder="عود، مسك، ورد، عنبر..."
                      value={perfumeData.notes ?? ''}
                      onChange={(e) => setPerfumeData((p) => ({ ...p, notes: e.target.value }))}
                      dir="rtl" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">رابط المنتج</label>
                    <input type="url" className="luxury-input text-sm" placeholder="https://mahwous.com/products/..."
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      dir="ltr" />
                  </div>
                </div>
              )}

              {/* WhatsApp number */}
              <div className="glass-card p-4">
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                  📲 رقم الواتساب للطلبات
                </label>
                <input type="tel" className="luxury-input text-sm" placeholder="+966xxxxxxxxx"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  dir="ltr" />
              </div>

              {/* Bottle upload */}
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

              {/* LoRA */}
              <LoraConfig
                loraPath={loraPath}
                loraTriggerWord={loraTriggerWord}
                onLoraPathChange={setLoraPath}
                onTriggerWordChange={setLoraTriggerWord}
              />

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button onClick={handleGenerate}
                disabled={isGenerating || !perfumeData.name || !perfumeData.brand}
                className="btn-gold w-full flex items-center justify-center gap-3 text-base py-5 rounded-2xl">
                {isGenerating
                  ? <><Loader2 size={18} className="animate-spin" />جاري التوليد...</>
                  : <><Sparkles size={18} />توليد الحملة الإعلانية</>}
              </button>

              <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                3 صور بالتوازي (Story · Post · Landscape) عبر{' '}
                <strong className="text-[var(--gold)]">Fal.ai FLUX-LoRA</strong>
              </p>
            </div>

            {/* RIGHT: Output */}
            <div className="space-y-8">
              {appStep === 'input' && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 opacity-40">
                  <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-[var(--obsidian-border)] flex items-center justify-center">
                    <FlaskConical size={40} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">ستظهر الصور المُولَّدة هنا</p>
                </div>
              )}

              {appStep === 'output' && (
                <>
                  {/* Images */}
                  {generatedImages.length > 0 && (
                    <OutputGrid images={generatedImages} perfumeName={perfumeData.name} />
                  )}

                  {/* ── MAKE.COM SEND BUTTON ─────────────────────────────────────── */}
                  {generatedImages.length > 0 && captions && (
                    <div className="glass-card p-5 space-y-4 border border-[var(--gold)]/20">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--gold-muted)] flex items-center justify-center">
                          <span className="text-base">⚡</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            النشر التلقائي على 8 منصات
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Snapchat · TikTok · Instagram · Facebook · LinkedIn · Pinterest · YouTube · WhatsApp
                          </p>
                        </div>
                      </div>

                      {/* Platform routing visual */}
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        {[
                          { label: '9:16', platforms: 'Snap · TikTok · Reels · Story · WhatsApp', color: 'text-pink-400' },
                          { label: '1:1', platforms: 'Instagram · Facebook · Pinterest', color: 'text-blue-400' },
                          { label: '16:9', platforms: 'LinkedIn · YouTube', color: 'text-cyan-400' },
                        ].map((item) => (
                          <div key={item.label} className="bg-black/20 rounded-lg p-2 text-center space-y-1">
                            <p className={`font-mono font-bold ${item.color}`}>{item.label}</p>
                            <p className="text-[var(--text-muted)] leading-tight">{item.platforms}</p>
                          </div>
                        ))}
                      </div>

                      {/* Send button */}
                      <button
                        onClick={handleSendToMake}
                        disabled={sendStatus === 'sending' || sendStatus === 'success'}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all
                          ${sendStatus === 'success'
                            ? 'bg-green-500/20 border border-green-500/40 text-green-400 cursor-default'
                            : sendStatus === 'sending'
                            ? 'opacity-60 cursor-wait btn-ghost'
                            : 'btn-gold'
                          }`}
                      >
                        {sendStatus === 'sending' && <Loader2 size={16} className="animate-spin" />}
                        {sendStatus === 'success' && <CheckCircle size={16} />}
                        {sendStatus === 'idle' || sendStatus === 'error'
                          ? <Send size={16} />
                          : null}
                        {sendStatus === 'idle' && 'إرسال إلى منصة الجدولة (Make.com)'}
                        {sendStatus === 'sending' && 'جاري الإرسال...'}
                        {sendStatus === 'success' && 'تم الإرسال ✅'}
                        {sendStatus === 'error' && 'إعادة المحاولة'}
                      </button>

                      {/* Status message */}
                      {sendMessage && (
                        <p className={`text-xs text-center leading-relaxed ${
                          sendStatus === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {sendMessage}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Prompt */}
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

                  {/* Captions loading */}
                  {generatingCaptions && !captions && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
                      <Loader2 size={14} className="animate-spin text-[var(--gold)]" />
                      Claude يكتب الكابشنات البيعية...
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
            Powered by Fal.ai · Anthropic Claude · Google Gemini · Make.com
          </p>
          <p className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} مهووس | Mahwous</p>
        </div>
      </footer>
    </div>
  );
}
