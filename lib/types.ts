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
  // ── Fal.ai LoRA fields ─────────────────────────────────────────────────────
  /** Direct URL to the LoRA .safetensors weights file on fal.ai or HuggingFace */
  loraPath?: string;
  /** Trigger word injected at the START of the prompt — activates the trained face */
  loraTriggerWord?: string;
  // ── Bottle reference ───────────────────────────────────────────────────────
  /** Base64-encoded bottle reference image (with data:image/... prefix) */
  bottleImageBase64?: string;
  /** Claude/Gemini Vision description of the bottle for prompt injection */
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
  captions: {
    instagram: string;
    twitter: string;
  };
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
