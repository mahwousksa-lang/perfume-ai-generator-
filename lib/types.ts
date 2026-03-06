// ============================================================
// lib/types.ts — Core type definitions for the entire app
// ============================================================

export type Vibe =
  | 'rose_garden'
  | 'majlis'
  | 'royal_luxury'
  | 'modern_corporate'
  | 'winter_cabin'
  | 'classic_library'
  | 'desert_sunset'
  | 'oriental_palace'
  | 'modern_minimalist'
  | 'ocean_breeze';

export type Attire =
  | 'black_suit_gold_details'
  | 'saudi_bisht'
  | 'white_thobe_black_bisht'
  | 'charcoal_suit_gold_tie'
  | 'white_thobe_only'
  | 'navy_suit'
  | 'beige_thobe_brown_bisht';

export interface PerfumeData {
  name: string;
  brand: string;
  gender?: 'men' | 'women' | 'unisex';
  notes?: string;
  description?: string;
  imageUrl?: string;
  price?: string;
}

export interface GenerationRequest {
  perfumeData: PerfumeData;
  vibe: string;
  attire: string;
  loraPath?: string;
  loraTriggerWord?: string;
  bottleImageBase64?: string;
  bottleDescription?: string;
}

export interface GeneratedImage {
  format: 'story' | 'post' | 'landscape';
  label: string;
  aspectRatio: string;
  url: string;
  dimensions: { width: number; height: number };
}

export interface GenerationResult {
  images: GeneratedImage[];
  prompt: string;
  negativePrompt: string;
}

// ── Platform Distribution Types ─────────────────────────────────────────────

export type SourceFormat = 'story' | 'post' | 'landscape';

export interface PlatformUsage {
  id: string;
  platform: string;
  platformAr: string;
  usage: string;
  usageAr: string;
  sourceFormat: SourceFormat;
  icon: string;
  color: string;
  hasCaption: boolean;
  captionKey: string;
}

export interface PlatformCaptions {
  instagram_post: string;
  instagram_story: string;
  facebook_post: string;
  facebook_story: string;
  twitter: string;
  linkedin: string;
  snapchat: string;
  tiktok: string;
  pinterest: string;
  telegram: string;
  haraj: string;
  truth_social: string;
  youtube_thumbnail: string;
  youtube_shorts: string;
  whatsapp: string;
}

export interface DistributionResult {
  captions: PlatformCaptions;
  source: string;
}

// ── Scrape Types ────────────────────────────────────────────────────────────

export interface ScrapedProduct {
  name?: string;
  brand?: string;
  gender?: string;
  notes?: string;
  description?: string;
  imageUrl?: string;
  price?: string;
}

export interface ScrapeResult {
  product: ScrapedProduct;
  recommendation: {
    vibe: string;
    attire: string;
    reasoning: string;
  };
}

export interface CaptionResult {
  captions: PlatformCaptions | Record<string, string>;
  source?: string;
}

export interface BottleAnalysisResult {
  description: string;
  bottleShape: string;
  dominantColor: string;
  labelDescription: string;
}

// UI state types
export type AppStep = 'input' | 'generating' | 'output';

export interface GenerationProgress {
  story: 'pending' | 'generating' | 'done' | 'error';
  post: 'pending' | 'generating' | 'done' | 'error';
  landscape: 'pending' | 'generating' | 'done' | 'error';
}

// Video Generation Types
export interface VideoGenerationResult {
  videoId: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  url?: string;
}

// Video Scenario Types
export interface VideoScenario {
  platform: string;
  hook: string;
  action: string;
  voiceover: string;
  cta: string;
}
