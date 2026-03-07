'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import {
  ArrowLeft, Loader2, Link2, Sparkles, Video, Image, Upload, X,
  Calendar, Download, FileText, Save, Clock, Package, Brain,
} from 'lucide-react';

import type {
  PerfumeData,
  GenerationResult,
  CaptionResult,
  ScrapeResult,
  AppStep,
  VideoScenario,
  PlatformCaptions,
  HedraVideoInfo,
  VideoPlatformCaptions,
} from '@/lib/types';

import OutputGrid from '@/components/OutputGrid';
import VideoDisplay from '@/components/VideoDisplay';
import SmartSchedulePanel from '@/components/SmartSchedulePanel';
import PostHistory from '@/components/PostHistory';
import { addToQueue, getQueue, downloadCSV, ALL_PLATFORMS, type QueuedPost } from '@/lib/contentQueue';
// Make.com removed — Metricool is the sole publishing engine
import MetricoolDashboard from '@/components/MetricoolDashboard';
import SmartPublishButton from '@/components/SmartPublishButton';
import { optimizeCaption } from '@/lib/selfLearningEngine';
import { schedulePost } from '@/lib/metricoolClient';

// ─── Main App Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState<AppStep>('input');
  const [productUrl, setProductUrl] = useState<string>('');
  const [perfumeData, setPerfumeData] = useState<PerfumeData | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null);
  const [scenarios, setScenarios] = useState<VideoScenario[] | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'schedule' | 'intelligence'>('images');
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  // ── Video generation state ──────────────────────────────────────────────
  const [videoInfos, setVideoInfos] = useState<HedraVideoInfo[]>([]);
  const [videoCaptions, setVideoCaptions] = useState<VideoPlatformCaptions | null>(null);
  const [voiceoverText, setVoiceoverText] = useState<string>('');
  const [isPollingVideos, setIsPollingVideos] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoInfosRef = useRef<HedraVideoInfo[]>([]);

  // ── Scrape data ────────────────────────────────────────────────────────
  const [scrapeVibe, setScrapeVibe] = useState<string>('');

  // ── Product reference image upload ──────────────────────────────────────
  const [bottleImageBase64, setBottleImageBase64] = useState<string>('');
  const [bottleImagePreview, setBottleImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Save state ─────────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);

  // ── Metricool state ────────────────────────────────────────────────────
  const [metricoolConnected, setMetricoolConnected] = useState(false);

  useEffect(() => {
    const checkMetricool = async () => {
      try {
        const res = await fetch('/api/metricool/config');
        const data = await res.json();
        setMetricoolConnected(data.connected === true);
      } catch {
        setMetricoolConnected(false);
      }
    };
    checkMetricool();
  }, []);

  const handleBottleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
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
      toast.success('تم رفع صورة المنتج');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBottleImage = () => {
    setBottleImageBase64('');
    setBottleImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Video polling logic ─────────────────────────────────────────────────
  useEffect(() => {
    videoInfosRef.current = videoInfos;
  }, [videoInfos]);

  const pollVideoStatus = useCallback(async () => {
    const currentVideos = videoInfosRef.current;
    const pendingVideos = currentVideos.filter(
      (v) => v.id && ['pending', 'processing', 'queued', 'finalizing'].includes(v.status)
    );

    if (pendingVideos.length === 0) {
      setIsPollingVideos(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    try {
      const pollRes = await fetch('/api/poll-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: pendingVideos.map((v) => ({ id: v.id, aspectRatio: v.aspectRatio })),
        }),
      });

      if (!pollRes.ok) return;
      const pollData = await pollRes.json();

      setVideoInfos((prev) => {
        const updated = [...prev];
        for (const result of pollData.results) {
          const idx = updated.findIndex((v) => v.aspectRatio === result.aspectRatio);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              status: result.status,
              videoUrl: result.videoUrl || updated[idx].videoUrl,
              progress: result.progress ?? updated[idx].progress,
              eta_sec: result.eta_sec,
              error: result.error,
            };
          }
        }
        return updated;
      });

      if (pollData.allComplete) {
        setIsPollingVideos(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        toast.success('تم توليد الفيديوهات بنجاح!');
      }
    } catch (err) {
      console.error('[pollVideoStatus] Error:', err);
    }
  }, []);

  useEffect(() => {
    if (!isPollingVideos) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const initialTimeout = setTimeout(() => pollVideoStatus(), 8000);
    pollIntervalRef.current = setInterval(() => pollVideoStatus(), 12000);
    return () => {
      clearTimeout(initialTimeout);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isPollingVideos, pollVideoStatus]);

  // ── Generate Videos ─────────────────────────────────────────────────────
  const handleGenerateVideos = async () => {
    if (!perfumeData || !generationResult?.images?.length) {
      toast.error('يجب توليد الصور أولاً');
      return;
    }

    const storyImage = generationResult.images.find((img) => img.format === 'story');
    const landscapeImage = generationResult.images.find((img) => img.format === 'landscape');
    const imageUrl = storyImage?.url || generationResult.images[0]?.url;
    const landscapeImageUrl = landscapeImage?.url || imageUrl;

    if (!imageUrl) {
      toast.error('لا توجد صورة مرجعية لتوليد الفيديو');
      return;
    }

    try {
      toast.info('جاري بدء توليد الفيديوهات...');

      setVideoInfos([
        { id: '', aspectRatio: '9:16', status: 'pending', progress: 0 },
        { id: '', aspectRatio: '16:9', status: 'pending', progress: 0 },
      ]);

      const videoRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfumeData, imageUrl, landscapeImageUrl, vibe: scrapeVibe }),
      });

      if (!videoRes.ok) {
        const err = await videoRes.json();
        throw new Error(err.error || 'فشل بدء توليد الفيديو');
      }

      const videoData = await videoRes.json();
      setVoiceoverText(videoData.voiceoverText || '');

      const newVideoInfos: HedraVideoInfo[] = videoData.videos.map((v: {
        id: string; aspectRatio: '9:16' | '16:9'; status: string;
        error?: string; voiceoverText?: string; scenarioName?: string; hook?: string;
      }) => ({
        id: v.id, aspectRatio: v.aspectRatio,
        status: v.status as HedraVideoInfo['status'],
        progress: 0, error: v.error,
        voiceoverText: v.voiceoverText, scenarioName: v.scenarioName, hook: v.hook,
      }));

      setVideoInfos(newVideoInfos);
      videoInfosRef.current = newVideoInfos;

      const hasPending = newVideoInfos.some(
        (v) => v.id && v.status !== 'failed' && v.status !== 'error'
      );
      if (hasPending) setIsPollingVideos(true);

      // Generate video captions in parallel
      try {
        const capRes = await fetch('/api/video-captions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfumeData, productUrl: productUrl.trim(), vibe: scrapeVibe }),
        });
        if (capRes.ok) {
          const capData = await capRes.json();
          setVideoCaptions(capData.captions);
        }
      } catch { console.warn('Video captions generation failed'); }

      toast.success('تم بدء توليد الفيديوهات — سيتم تحديث الحالة تلقائياً');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'حدث خطأ في توليد الفيديو';
      toast.error(errorMessage);
      setVideoInfos([]);
    }
  };

  // ── Generate Campaign ───────────────────────────────────────────────────
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
      setScrapeVibe(scrapeData.recommendation.vibe);

      // Step 2: Generate images
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
          format: string; label: string;
          dimensions: { width: number; height: number };
          url: string; aspectRatio: string;
        }) => ({
          format: img.format as 'story' | 'post' | 'landscape',
          label: img.label, dimensions: img.dimensions,
          url: img.url, aspectRatio: img.aspectRatio,
        }));
      } else if (genData.pendingImages) {
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
                format: fmt, label: result.label, dimensions: result.dimensions,
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
        images: completedImages, prompt: genData.prompt || '', negativePrompt: '',
      };
      setGenerationResult(finalGenData);

      // Step 3: Generate captions
      setLoadingStatus('جاري كتابة الكابشنات لجميع المنصات...');
      const capRes = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeData: product, vibe: scrapeData.recommendation.vibe,
          attire: scrapeData.recommendation.attire, productUrl: productUrl.trim(),
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
        body: JSON.stringify({ perfumeData: product, vibe: scrapeData.recommendation.vibe }),
      });
      if (scenRes.ok) {
        const scenData = await scenRes.json();
        setScenarios(scenData.scenarios);
      }

      setStep('output');
      toast.success('حملتك جاهزة لجميع المنصات!');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'حدث خطأ غير متوقع.';
      toast.error(errorMessage);
      setStep('input');
    }
  };

  // ── Quick Actions (inline) ──────────────────────────────────────────────
  const handleSavePost = () => {
    if (!perfumeData || !generationResult) return;
    const storyImg = generationResult.images.find(i => i.format === 'story')?.url || '';
    const postImg = generationResult.images.find(i => i.format === 'post')?.url || '';
    const landscapeImg = generationResult.images.find(i => i.format === 'landscape')?.url || '';
    const verticalVideo = videoInfos.find(v => v.aspectRatio === '9:16' && v.videoUrl)?.videoUrl || '';
    const horizontalVideo = videoInfos.find(v => v.aspectRatio === '16:9' && v.videoUrl)?.videoUrl || '';

    const post: Omit<QueuedPost, 'id' | 'timestamp' | 'sheetsExported'> = {
      perfumeName: perfumeData.name,
      perfumeBrand: perfumeData.brand,
      productUrl,
      storyImageUrl: storyImg,
      postImageUrl: postImg,
      landscapeImageUrl: landscapeImg,
      verticalVideoUrl: verticalVideo,
      horizontalVideoUrl: horizontalVideo,
      verticalVoiceover: videoInfos.find(v => v.aspectRatio === '9:16')?.voiceoverText || '',
      horizontalVoiceover: videoInfos.find(v => v.aspectRatio === '16:9')?.voiceoverText || '',
      captions: (captionResult?.captions || {}) as Record<string, string>,
      videoCaptions: (videoCaptions || {}) as Record<string, string>,
      scheduledTime: null,
      platforms: ALL_PLATFORMS.map(p => p.id),
      status: 'draft',
    };
    addToQueue(post);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast.success('تم حفظ المنشور في قائمة المحتوى');
  };

  const handleDownloadAll = () => {
    if (!perfumeData || !generationResult) return;
    const urls: string[] = [];
    generationResult.images.forEach(img => { if (img.url) urls.push(img.url); });
    videoInfos.forEach(v => { if (v.videoUrl) urls.push(v.videoUrl); });
    if (urls.length === 0) { toast.error('لا توجد ملفات للتحميل'); return; }
    urls.forEach(url => window.open(url, '_blank', 'noopener,noreferrer'));
    toast.success(`جاري تحميل ${urls.length} ملفات`);
  };

  const handleDownloadCaptions = () => {
    if (!perfumeData) return;
    const allCaptions = { ...(captionResult?.captions || {}), ...(videoCaptions || {}) };
    const lines: string[] = [];
    lines.push(`كابشنات عطر: ${perfumeData.name}`);
    lines.push(`العلامة: ${perfumeData.brand}`);
    lines.push(`الرابط: ${productUrl}`);
    lines.push('═'.repeat(50));
    for (const [key, value] of Object.entries(allCaptions)) {
      if (value && typeof value === 'string') {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        lines.push(`\n▸ ${name}:\n${value}`);
        lines.push('─'.repeat(40));
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahwous-captions-${perfumeData.name.replace(/\s+/g, '-').substring(0, 30)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم تحميل ملف الكابشنات');
  };

  const handleExportCSV = () => {
    const queue = getQueue();
    if (queue.length === 0) { toast.error('لا توجد منشورات محفوظة — احفظ المنشور أولاً'); return; }
    downloadCSV(queue);
    toast.success(`تم تصدير ${queue.length} منشور إلى CSV`);
  };

  // ── Make.com محذوف — Metricool هو المحرك الوحيد للنشر ────────────────────

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
    setVideoInfos([]);
    setVideoCaptions(null);
    setVoiceoverText('');
    setIsPollingVideos(false);
    setScrapeVibe('');
    setSaved(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const queueCount = typeof window !== 'undefined' ? getQueue().length : 0;

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
                أدخل رابط أي عطر من متجر مهووس، وسيقوم الذكاء الاصطناعي بتوليد صور وفيديوهات احترافية مع كابشنات مخصصة لكل منصة.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-4">
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

              {/* Product Reference Image Upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Upload size={12} />
                  <span>صورة المنتج المرجعية (اختياري — لدقة شكل الزجاجة)</span>
                </div>

                {!bottleImagePreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[var(--obsidian-border)] rounded-xl cursor-pointer hover:border-[var(--gold)] hover:bg-[var(--obsidian-light)] transition-all group">
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors">
                      <Upload size={20} />
                      <span className="text-xs">اسحب الصورة هنا أو اضغط للاختيار</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBottleImageUpload} />
                  </label>
                ) : (
                  <div className="relative w-full rounded-xl border border-[var(--gold)] bg-[var(--obsidian-light)] p-3">
                    <div className="flex items-center gap-4">
                      <img src={bottleImagePreview} alt="صورة المنتج" className="w-16 h-16 object-contain rounded-lg bg-white/5" />
                      <div className="flex-1 text-right">
                        <p className="text-xs text-[var(--gold)] font-medium">تم رفع صورة المنتج</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">ستُستخدم كمرجع لشكل الزجاجة</p>
                      </div>
                      <button onClick={handleRemoveBottleImage} className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors" title="إزالة">
                        <X size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateCampaign}
                disabled={!productUrl.trim()}
                className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-40"
              >
                <Sparkles size={16} />
                {bottleImageBase64 ? 'ابدأ التوليد (مع صورة مرجعية)' : 'ابدأ توليد الحملة'}
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)]">
              {['3 صور لكل المنصات', '2 فيديو بصوت عربي', 'كابشنات لـ 11 منصة', 'جدولة ونشر ذكي'].map((f) => (
                <span key={f} className="px-3 py-1 rounded-full border border-[var(--obsidian-border)] bg-[var(--obsidian-light)]">{f}</span>
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
        {step === 'output' && generationResult && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Product Info */}
            {perfumeData && (
              <div className="glass-card p-4 flex items-center gap-4">
                {perfumeData.imageUrl && (
                  <img src={perfumeData.imageUrl} alt={perfumeData.name} className="w-16 h-16 object-contain rounded-lg bg-black/20" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{perfumeData.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{perfumeData.brand}</p>
                  {perfumeData.price && <p className="text-xs text-[var(--gold)]">{perfumeData.price}</p>}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                 شريط الأدوات السريعة — واضح ومبسط مع وصف لكل زر
                 ══════════════════════════════════════════════════════════════ */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-[var(--gold)]" />
                  <h3 className="text-base font-bold text-[var(--gold)]">أدوات سريعة</h3>
                </div>
                {queueCount > 0 && (
                  <span className="text-xs px-3 py-1 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] font-medium">
                    {queueCount} منشور محفوظ
                  </span>
                )}
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                احفظ المنشور أولاً ثم انشر ذكياً عبر Metricool أو حمّل الملفات للنشر اليدوي
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* زر 1: حفظ المنشور */}
                <button
                  onClick={handleSavePost}
                  disabled={saved}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-[var(--obsidian-border)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 transition-all text-center group"
                >
                  {saved ? <Save size={24} className="text-green-400" /> : <Save size={24} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />}
                  <span className="text-sm font-bold text-[var(--text-primary)]">{saved ? 'تم الحفظ!' : 'حفظ المنشور'}</span>
                  <span className="text-[11px] text-[var(--text-muted)] leading-snug">يحفظ كل الصور والفيديو والكابشنات للنشر لاحقاً</span>
                </button>

                {/* زر 2: تحميل الكل */}
                <button
                  onClick={handleDownloadAll}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-[var(--obsidian-border)] hover:border-green-500 hover:bg-green-500/5 transition-all text-center group"
                >
                  <Download size={24} className="text-green-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">تحميل الكل</span>
                  <span className="text-[11px] text-[var(--text-muted)] leading-snug">يفتح كل الصور والفيديوهات لتحميلها مباشرة</span>
                </button>

                {/* زر 3: تحميل الكابشنات */}
                <button
                  onClick={handleDownloadCaptions}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-[var(--obsidian-border)] hover:border-purple-500 hover:bg-purple-500/5 transition-all text-center group"
                >
                  <FileText size={24} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">تحميل الكابشنات</span>
                  <span className="text-[11px] text-[var(--text-muted)] leading-snug">ملف نصي بكل الكابشنات للنشر اليدوي</span>
                </button>

                {/* زر 4: تصدير CSV */}
                <button
                  onClick={handleExportCSV}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-[var(--obsidian-border)] hover:border-blue-500 hover:bg-blue-500/5 transition-all text-center group"
                >
                  <Clock size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">تصدير CSV</span>
                  <span className="text-[11px] text-[var(--text-muted)] leading-snug">ملف CSV للأرشفة والتحليل</span>
                </button>
              </div>

              {/* ══════ حالة الاتصال بـ Metricool ══════ */}
              <div className="mt-4 pt-4 border-t border-[var(--obsidian-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: metricoolConnected ? '#22c55e' : '#ef4444'}} />
                    <span className="text-xs text-[var(--text-muted)]">
                      {metricoolConnected ? 'Metricool متصل — النشر الذكي جاهز' : 'Metricool غير متصل'}
                    </span>
                  </div>
                  {!metricoolConnected && (
                    <button
                      onClick={() => setActiveTab('intelligence')}
                      className="text-xs text-[var(--gold)] hover:underline"
                    >
                      اربط Metricool الآن
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ══════ Smart Publish — النشر الذكي ══════ */}
            {perfumeData && (
              <SmartPublishButton
                perfumeData={perfumeData}
                productUrl={productUrl}
                captions={(captionResult?.captions || {}) as Record<string, string>}
                imageUrls={{
                  story: generationResult.images.find(i => i.format === 'story')?.url,
                  post: generationResult.images.find(i => i.format === 'post')?.url,
                  landscape: generationResult.images.find(i => i.format === 'landscape')?.url,
                }}
                videoUrls={{
                  vertical: videoInfos.find(v => v.aspectRatio === '9:16' && v.videoUrl)?.videoUrl || undefined,
                  horizontal: videoInfos.find(v => v.aspectRatio === '16:9' && v.videoUrl)?.videoUrl || undefined,
                }}
              />
            )}

            {/* Tab Navigation — 4 tabs مع وصف */}
            <div className="flex gap-1 p-1.5 bg-[var(--obsidian-light)] rounded-xl">
              {[
                { key: 'images', label: 'الصور والكابشنات', desc: '3 صور + كابشن لكل منصة', icon: Image },
                { key: 'videos', label: 'الفيديو', desc: 'عمودي + أفقي بصوت عربي', icon: Video },
                { key: 'schedule', label: 'الجدولة والنشر', desc: 'جدولة ذكية + تاريخ النشر', icon: Calendar },
                { key: 'intelligence', label: 'مركز الذكاء', desc: 'تحليلات + تعلم ذاتي + منافسون', icon: Brain },
              ].map(({ key, label, desc, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'images' | 'videos' | 'schedule' | 'intelligence')}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-lg transition-all ${
                    activeTab === key
                      ? 'bg-[var(--gold)] text-black'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="text-sm font-bold">{label}</span>
                    {key === 'videos' && isPollingVideos && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <span className={`text-[10px] ${activeTab === key ? 'text-black/60' : 'text-[var(--text-muted)]'}`}>{desc}</span>
                </button>
              ))}
            </div>

            {/* ══════ Images Tab ══════ */}
            {activeTab === 'images' && (
              <OutputGrid
                images={generationResult.images}
                captions={(captionResult?.captions as PlatformCaptions) || null}
                perfumeName={perfumeData?.name}
              />
            )}

            {/* ══════ Videos Tab ══════ */}
            {activeTab === 'videos' && (
              <div className="space-y-6">
                {videoInfos.length === 0 && (
                  <div className="text-center py-8 space-y-6">
                    <div className="space-y-3">
                      <Video size={48} className="mx-auto text-[var(--gold)] opacity-60" />
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">توليد فيديوهات إعلانية</h3>
                      <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                        فيديو عمودي (9:16) لتيك توك وريلز — شبابي وحماسي
                        <br />
                        فيديو أفقي (16:9) ليوتيوب — ثقافي ومعلوماتي
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateVideos}
                      className="btn-gold px-8 py-3 text-sm flex items-center justify-center gap-2 rounded-xl mx-auto"
                    >
                      <Video size={16} />
                      ابدأ توليد الفيديوهات
                    </button>
                  </div>
                )}

                {videoInfos.length > 0 && (
                  <VideoDisplay
                    videos={videoInfos}
                    captions={videoCaptions}
                    voiceoverText={voiceoverText}
                    perfumeName={perfumeData?.name}
                  />
                )}
              </div>
            )}

            {/* ══════ Schedule Tab ══════ */}
            {activeTab === 'schedule' && perfumeData && (
              <div className="space-y-6">
                <SmartSchedulePanel
                  perfumeData={perfumeData}
                  productUrl={productUrl}
                  images={generationResult.images}
                  captions={captionResult?.captions || null}
                  videoInfos={videoInfos}
                  videoCaptions={videoCaptions}
                />
                <PostHistory />
              </div>
            )}

            {/* ══════ Intelligence Tab ══════ */}
            {activeTab === 'intelligence' && (
              <MetricoolDashboard />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
