'use client';

import { useState } from 'react';
import {
  Loader2, Send, CheckCircle2, XCircle, Download,
  Smartphone, ShoppingBag, Ghost, Zap,
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
  const [offlineContent, setOfflineContent] = useState<string>('');

  const isConnected = isMetricoolConfigured();

  // ── Smart Publish to all platforms via Metricool ──────────────────────
  const handleSmartPublish = async () => {
    if (!isConnected) {
      toast.error('اربط Metricool أولاً من تاب "مركز الذكاء"');
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
          perfumeName: perfumeData.name,
          perfumeBrand: perfumeData.brand,
          productUrl,
          captions: captions || {},
          imageUrls,
          videoUrls: videoUrls || {},
          hashtags: [
            '#عطور', '#مهووس_ستور', '#عطور_أصلية', '#perfume',
            '#fragrance', '#السعودية', '#luxury',
            `#${perfumeData.brand?.replace(/\s+/g, '_') || 'عطر'}`,
          ],
          platforms: ['INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'LINKEDIN', 'PINTEREST'],
          autoSchedule: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setShowResults(true);
        toast.success(data.message);
      } else {
        toast.error(data.error || 'فشل النشر');
      }
    } catch (error) {
      toast.error('خطأ في الاتصال بالخادم');
      console.error('[SmartPublish] Error:', error);
    } finally {
      setPublishing(false);
    }
  };

  // ── Generate offline packs for WhatsApp, Haraj, Snapchat ──────────────
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
          imageUrls,
          videoUrls: videoUrls || {},
          price: perfumeData.price,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOfflineContent(data.textFileContent);

        // Auto-download the text file
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
    } catch (error) {
      toast.error('خطأ في التوليد');
    } finally {
      setGeneratingOffline(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={18} className="text-[var(--gold)]" />
        <h3 className="text-base font-bold text-[var(--gold)]">النشر الذكي</h3>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        انشر على جميع المنصات بضغطة واحدة — كل منصة تحصل على محتوى مخصص لها بالكابشن والهاشتاقات المناسبة
      </p>

      {/* Main Publish Button */}
      <button
        onClick={handleSmartPublish}
        disabled={publishing || !isConnected}
        className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: isConnected
            ? 'linear-gradient(135deg, #D4AF37, #B8860B)'
            : 'var(--obsidian-light)',
          color: isConnected ? 'black' : 'var(--text-muted)',
          border: isConnected ? 'none' : '1px solid var(--obsidian-border)',
        }}
      >
        {publishing ? (
          <><Loader2 size={18} className="animate-spin" /> جاري النشر على جميع المنصات...</>
        ) : (
          <><Send size={18} /> نشر ذكي على جميع المنصات (Metricool)</>
        )}
      </button>

      {!isConnected && (
        <p className="text-xs text-yellow-400 text-center">
          ⚠️ اربط Metricool من تاب &quot;مركز الذكاء&quot; لتفعيل النشر التلقائي
        </p>
      )}

      {/* Publish Results */}
      {showResults && results.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
          <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2">نتائج النشر:</h4>
          {results.map((result, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--obsidian-border)]/50 last:border-0">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
                <span className="text-[var(--text-primary)] capitalize">{result.platform.toLowerCase()}</span>
              </div>
              <span className={`${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'تم الجدولة ✓' : 'فشل'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[var(--obsidian-border)] pt-4">
        <p className="text-xs text-[var(--text-muted)] mb-3">
          📱 المنصات بدون أتمتة — حمّل ملف المحتوى الجاهز:
        </p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
            <Smartphone size={16} className="text-green-400" />
            <span className="text-[10px] text-[var(--text-muted)]">واتساب</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
            <ShoppingBag size={16} className="text-blue-400" />
            <span className="text-[10px] text-[var(--text-muted)]">حراج</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--obsidian-light)] border border-[var(--obsidian-border)]">
            <Ghost size={16} className="text-yellow-400" />
            <span className="text-[10px] text-[var(--text-muted)]">سناب شات</span>
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
