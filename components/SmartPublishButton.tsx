'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Send, CheckCircle2, XCircle, Download,
  Smartphone, ShoppingBag, Ghost, Zap, Clock,
  TrendingUp, Eye, MessageCircle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { isMetricoolConfigured, getMetricoolCredentials } from '@/lib/metricoolClient';

interface SmartPublishButtonProps {
  perfumeData: {
    name: string;
    brand: string;
    price?: string;
  };
  productUrl: string;
  captions: Record<string, string> | null;
  imageUrls: {
    story?: string;
    post?: string;
    landscape?: string;
  };
  videoUrls?: {
    vertical?: string;
    horizontal?: string;
  };
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  scheduledTime?: string;
  error?: string;
}

// ── أسماء المنصات بالعربي ──────────────────────────────────────────────────
const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'انستقرام',
  facebook: 'فيسبوك',
  twitter: 'تويتر / X',
  tiktok: 'تيك توك',
  linkedin: 'لينكد إن',
  youtube: 'يوتيوب',
  pinterest: 'بنترست',
  google_business: 'قوقل بزنس',
};

// ── أيقونات المنصات ──────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  tiktok: '#00f2ea',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  pinterest: '#E60023',
  google_business: '#4285F4',
};

export default function SmartPublishButton({
  perfumeData,
  productUrl,
  captions,
  imageUrls,
  videoUrls,
}: SmartPublishButtonProps) {
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [generatingOffline, setGeneratingOffline] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'pinterest',
  ]);
  const [publishMode, setPublishMode] = useState<'smart' | 'now'>('smart');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(isMetricoolConfigured());
  }, []);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // ── النشر الذكي عبر Metricool — المحرك الوحيد ──────────────────────────
  const handleSmartPublish = async () => {
    if (!isConnected) {
      toast.error('اربط Metricool أولاً من تاب "مركز الذكاء"');
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error('اختر منصة واحدة على الأقل');
      return;
    }

    setPublishing(true);
    setResults([]);
    setShowResults(false);

    try {
      const credentials = getMetricoolCredentials();

      const response = await fetch('/api/metricool/smart-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: credentials.userToken,
          blogId: credentials.blogId,
          userId: credentials.userId,
          perfumeName: perfumeData.name,
          perfumeBrand: perfumeData.brand,
          productUrl,
          captions: captions || {},
          imageUrls: imageUrls || {},
          videoUrls: videoUrls || {},
          hashtags: [
            '#عطور', '#مهووس_ستور', '#عطور_أصلية', '#perfume',
            '#fragrance', '#السعودية', '#luxury', '#عطر',
            `#${(perfumeData.brand || 'عطر').replace(/\s+/g, '_')}`,
            `#${(perfumeData.name || 'عطر').replace(/\s+/g, '_')}`,
          ],
          platforms: selectedPlatforms,
          autoSchedule: publishMode === 'smart',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setShowResults(true);
        toast.success(data.message);

        // حفظ النتائج في localStorage للتعلم الذاتي
        try {
          const publishLog = JSON.parse(localStorage.getItem('mahwous_publish_log') || '[]');
          publishLog.push({
            timestamp: new Date().toISOString(),
            perfumeName: perfumeData.name,
            platforms: selectedPlatforms,
            results: data.results,
            mode: publishMode,
          });
          // احتفظ بآخر 100 نشر فقط
          if (publishLog.length > 100) publishLog.splice(0, publishLog.length - 100);
          localStorage.setItem('mahwous_publish_log', JSON.stringify(publishLog));
        } catch { /* ignore storage errors */ }
      } else {
        toast.error(data.error || 'فشل النشر — تحقق من إعدادات Metricool');
        if (data.results) {
          setResults(data.results);
          setShowResults(true);
        }
      }
    } catch (error) {
      toast.error('خطأ في الاتصال بالخادم');
      console.error('[SmartPublish] Error:', error);
    } finally {
      setPublishing(false);
    }
  };

  // ── توليد حزمة المنصات غير المؤتمتة ──────────────────────────────────
  const handleGenerateOffline = async () => {
    setGeneratingOffline(true);
    try {
      const response = await fetch('/api/metricool/offline-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfumeName: perfumeData.name,
          perfumeBrand: perfumeData.brand,
          productUrl,
          captions: captions || {},
          imageUrls: imageUrls || {},
          videoUrls: videoUrls || {},
          price: perfumeData.price,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // تحميل الملف النصي تلقائياً
        const blob = new Blob([data.textFileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mahwous-offline-${perfumeData.name.replace(/\s+/g, '-').substring(0, 20)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('تم تحميل ملف المحتوى للمنصات غير المؤتمتة');
      } else {
        toast.error('فشل توليد المحتوى');
      }
    } catch {
      toast.error('خطأ في التوليد');
    } finally {
      setGeneratingOffline(false);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="glass-card p-5 space-y-4">
      {/* ── العنوان ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-[var(--gold)]" />
          <h3 className="text-base font-bold text-[var(--gold)]">النشر الذكي عبر Metricool</h3>
        </div>
        {isConnected && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            متصل
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        انشر على جميع المنصات بضغطة واحدة — كل منصة تحصل على محتوى مخصص لها بالكابشن والهاشتاقات والوسائط المناسبة
      </p>

      {/* ── اختيار المنصات ── */}
      <div className="space-y-2">
        <p className="text-[11px] text-[var(--text-muted)] font-medium">اختر المنصات للنشر:</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PLATFORM_NAMES).map(([id, name]) => (
            <button
              key={id}
              onClick={() => togglePlatform(id)}
              className="text-[10px] px-3 py-1.5 rounded-full border transition-all font-medium"
              style={{
                borderColor: selectedPlatforms.includes(id) ? PLATFORM_COLORS[id] : 'var(--obsidian-border)',
                backgroundColor: selectedPlatforms.includes(id) ? `${PLATFORM_COLORS[id]}20` : 'transparent',
                color: selectedPlatforms.includes(id) ? PLATFORM_COLORS[id] : 'var(--text-muted)',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ── وضع النشر ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setPublishMode('smart')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            publishMode === 'smart'
              ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]'
              : 'bg-[var(--obsidian-light)] text-[var(--text-muted)] border border-[var(--obsidian-border)]'
          }`}
        >
          <Sparkles size={14} />
          جدولة ذكية
          <span className="text-[9px] opacity-70">(أفضل وقت)</span>
        </button>
        <button
          onClick={() => setPublishMode('now')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            publishMode === 'now'
              ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]'
              : 'bg-[var(--obsidian-light)] text-[var(--text-muted)] border border-[var(--obsidian-border)]'
          }`}
        >
          <Send size={14} />
          نشر فوري
          <span className="text-[9px] opacity-70">(خلال دقيقتين)</span>
        </button>
      </div>

      {/* ── زر النشر الرئيسي ── */}
      <button
        onClick={handleSmartPublish}
        disabled={publishing || !isConnected || selectedPlatforms.length === 0}
        className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
        style={{
          background: isConnected && selectedPlatforms.length > 0
            ? 'linear-gradient(135deg, #D4AF37, #B8860B, #D4AF37)'
            : 'var(--obsidian-light)',
          color: isConnected && selectedPlatforms.length > 0 ? 'black' : 'var(--text-muted)',
          border: isConnected && selectedPlatforms.length > 0 ? 'none' : '1px solid var(--obsidian-border)',
        }}
      >
        {publishing ? (
          <><Loader2 size={18} className="animate-spin" /> جاري النشر على {selectedPlatforms.length} منصة...</>
        ) : (
          <>
            <Send size={18} />
            {publishMode === 'smart'
              ? `نشر ذكي على ${selectedPlatforms.length} منصة (أفضل وقت لكل منصة)`
              : `نشر فوري على ${selectedPlatforms.length} منصة`
            }
          </>
        )}
      </button>

      {!isConnected && (
        <p className="text-xs text-yellow-400 text-center">
          اربط Metricool من تاب &quot;مركز الذكاء&quot; لتفعيل النشر التلقائي
        </p>
      )}

      {/* ── نتائج النشر ── */}
      {showResults && results.length > 0 && (
        <div className="space-y-2 p-4 rounded-xl bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">نتائج النشر:</h4>
            <div className="flex items-center gap-2 text-[10px]">
              {successCount > 0 && (
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {successCount} نجح
                </span>
              )}
              {failCount > 0 && (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle size={12} /> {failCount} فشل
                </span>
              )}
            </div>
          </div>

          {results.map((result, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-black/20 border border-[var(--obsidian-border)]/30">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
                <span
                  className="font-medium"
                  style={{ color: PLATFORM_COLORS[result.platform.toLowerCase()] || 'var(--text-primary)' }}
                >
                  {PLATFORM_NAMES[result.platform.toLowerCase()] || result.platform}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.scheduledTime && result.success && (
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(result.scheduledTime).toLocaleString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'تم الجدولة' : 'فشل'}
                </span>
              </div>
            </div>
          ))}

          {failCount > 0 && (
            <p className="text-[10px] text-yellow-400 mt-2 text-center">
              تحقق من ربط المنصات الفاشلة في حسابك على Metricool
            </p>
          )}
        </div>
      )}

      {/* ── المنصات غير المؤتمتة ── */}
      <div className="border-t border-[var(--obsidian-border)] pt-4">
        <p className="text-xs text-[var(--text-muted)] mb-3 font-medium">
          المنصات بدون أتمتة — حمّل ملف المحتوى الجاهز:
        </p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
            <Smartphone size={16} className="text-green-400" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">واتساب</span>
            <span className="text-[8px] text-[var(--text-muted)]">حالة + ستوري</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
            <ShoppingBag size={16} className="text-blue-400" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">حراج</span>
            <span className="text-[8px] text-[var(--text-muted)]">صور + وصف</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
            <Ghost size={16} className="text-yellow-400" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">سناب شات</span>
            <span className="text-[8px] text-[var(--text-muted)]">صور + فيديو</span>
          </div>
        </div>

        <button
          onClick={handleGenerateOffline}
          disabled={generatingOffline}
          className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-[var(--obsidian-light)] border border-[var(--obsidian-border)] text-[var(--text-primary)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all"
        >
          {generatingOffline ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التوليد...</>
          ) : (
            <><Download size={14} /> تحميل ملف المحتوى (واتساب + حراج + سناب)</>
          )}
        </button>
      </div>
    </div>
  );
}
