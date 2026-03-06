
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { ArrowLeft, Loader, Download, Share2, Twitter, Instagram } from 'lucide-react';

import type {
  PerfumeData,
  GenerationResult,
  ScrapeResult,
  CaptionResult,
  AppStep,
  GeneratedImage,
} from '@/lib/types';

// ─── Components ───────────────────────────────────────────────────────────────
import UrlScraper from '@/components/UrlScraper';
import OutputGrid from '@/components/OutputGrid';
import CaptionDisplay from '@/components/CaptionDisplay';

// ─── Main App Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState<AppStep>('input');
  const [productUrl, setProductUrl] = useState<string>('');
  const [perfumeData, setPerfumeData] = useState<PerfumeData | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── API Call: Scrape + Analyze + Generate + Caption ────────────────────────
  const handleGenerateCampaign = async (url: string) => {
    if (!url) {
      toast.error('الرجاء إدخال رابط المنتج أولاً.');
      return;
    }
    setProductUrl(url);
    setStep('generating');
    setError(null);

    try {
      // Step 1: Scrape and analyze
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!scrapeRes.ok) {
        const err = await scrapeRes.json();
        throw new Error(err.error || 'فشل استخراج البيانات من الرابط.');
      }
      const scrapeData: ScrapeResult = await scrapeRes.json();
      const productAsPerfumeData: PerfumeData = {
        name: scrapeData.product.name ?? '',
        brand: scrapeData.product.brand ?? '',
        gender: (scrapeData.product.gender as PerfumeData['gender']) ?? 'unisex',
        notes: scrapeData.product.notes,
        description: scrapeData.product.description,
        imageUrl: scrapeData.product.imageUrl,
        price: scrapeData.product.price,
      };
      setPerfumeData(productAsPerfumeData);

      // Step 2: Generate images
      const generationReqBody = {
        perfumeData: scrapeData.product,
        vibe: scrapeData.recommendation.vibe,
        attire: scrapeData.recommendation.attire,
      };
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generationReqBody),
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'فشل توليد الصور.');
      }
      const genData: GenerationResult = await genRes.json();
      setGenerationResult(genData);

      // Step 3: Generate captions
      const captionReqBody = {
        perfumeData: scrapeData.product,
        vibe: scrapeData.recommendation.vibe,
        attire: scrapeData.recommendation.attire,
        productUrl: url,
      };
      const capRes = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(captionReqBody),
      });
      if (!capRes.ok) {
        const err = await capRes.json();
        throw new Error(err.error || 'فشل توليد الكابشن.');
      }
      const capData: CaptionResult = await capRes.json();
      setCaptionResult(capData);

      setStep('output');
    } catch (e: any) {
      const errorMessage = e.message || 'حدث خطأ غير متوقع.';
      setError(errorMessage);
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
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-gold-400 mb-2">مولد حملات العطور بالذكاء الاصطناعي</h1>
              <p className="text-lg text-gray-300 mb-8">فقط أدخل رابط المنتج، ودع الذكاء الاصطناعي يبني لك حملة تسويقية متكاملة.</p>
              <UrlScraper onScrape={handleGenerateCampaign} />
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center flex flex-col items-center justify-center h-64"
            >
              <Loader className="animate-spin text-gold-400 h-12 w-12 mb-4" />
              <p className="text-xl text-gray-300">جاري بناء حملتك الإعلانية... قد يستغرق الأمر دقيقة أو دقيقتين.</p>
            </motion.div>
          )}

          {step === 'output' && generationResult && (
            <motion.div
              key="output"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button onClick={handleReset} className="flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors mb-4">
                <ArrowLeft size={20} />
                البدء من جديد
              </button>
              <h2 className="text-3xl font-bold text-center mb-6">حملتك جاهزة!</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gold-400">الصور المولّدة</h3>
                  <OutputGrid images={generationResult.images} perfumeName={perfumeData?.name ?? ''} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gold-400">الكابشن المقترح</h3>
                  {captionResult && <CaptionDisplay instagram={captionResult.captions.instagram} twitter={captionResult.captions.twitter} />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
