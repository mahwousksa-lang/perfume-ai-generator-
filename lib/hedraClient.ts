// ============================================================
// lib/hedraClient.ts
// Client for interacting with the Hedra API to generate videos.
// Uses the verified API endpoints and parameters.
// ============================================================

const HEDRA_API_KEY = process.env.HEDRA_API_KEY;
const HEDRA_BASE_URL = "https://api.hedra.com/web-app/public";

// ── Arabic Voice ────────────────────────────────────────────────────────────
export const ARABIC_VOICE_ID = "61d27b32-834c-4797-b9ff-4b0febed07f6"; // Omar (عمر)

// ── Video Models ────────────────────────────────────────────────────────────
// Hedra Avatar: Cinematic audio-driven characters with full-body acting
export const HEDRA_AVATAR_MODEL = "26f0fc66-152b-40ab-abed-76c43df99bc8";
// Kling V3 Standard I2V: Image-to-video with start frame
export const KLING_V3_I2V_MODEL = "2eb5fa4c-306e-45f8-99e4-2927ec0429a0";

// ── Types ───────────────────────────────────────────────────────────────────

export type VideoAspectRatio = "9:16" | "16:9" | "1:1";

export interface HedraGenerationRequest {
  type: "video";
  ai_model_id: string;
  generated_video_inputs: {
    text_prompt: string;
    aspect_ratio: VideoAspectRatio;
    duration_ms?: number;
    enhance_prompt?: boolean;
  };
  start_keyframe_url?: string;
  audio_generation?: {
    type: "text_to_speech";
    voice_id: string;
    text: string;
    language?: string;
  };
}

export interface HedraGenerationResponse {
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  asset_id?: string;
  progress?: number;
  eta_sec?: number;
  error?: string;
}

export interface HedraStatusResponse {
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  asset_id?: string;
  progress?: number;
  eta_sec?: number;
  error?: string;
}

export interface HedraAsset {
  id: string;
  type: string;
  url?: string;
  download_url?: string;
  thumbnail_url?: string;
}

// ── Helper ──────────────────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  if (!HEDRA_API_KEY) {
    throw new Error("HEDRA_API_KEY is not set in environment variables.");
  }
  return {
    "Content-Type": "application/json",
    "X-API-Key": HEDRA_API_KEY,
  };
}

// ── Create Video Generation ─────────────────────────────────────────────────

export async function createHedraVideo(params: {
  imageUrl: string;
  textPrompt: string;
  voiceoverText: string;
  aspectRatio: VideoAspectRatio;
  durationMs?: number;
}): Promise<HedraGenerationResponse> {
  const { imageUrl, textPrompt, voiceoverText, aspectRatio, durationMs = 10000 } = params;

  const body: HedraGenerationRequest = {
    type: "video",
    ai_model_id: HEDRA_AVATAR_MODEL,
    generated_video_inputs: {
      text_prompt: textPrompt,
      aspect_ratio: aspectRatio,
      duration_ms: durationMs,
      enhance_prompt: false,
    },
    start_keyframe_url: imageUrl,
    audio_generation: {
      type: "text_to_speech",
      voice_id: ARABIC_VOICE_ID,
      text: voiceoverText,
      language: "auto",
    },
  };

  console.log(`[Hedra] Creating ${aspectRatio} video with model ${HEDRA_AVATAR_MODEL}`);
  console.log(`[Hedra] Image URL: ${imageUrl.substring(0, 80)}...`);
  console.log(`[Hedra] Voiceover: ${voiceoverText.substring(0, 60)}...`);

  const response = await fetch(`${HEDRA_BASE_URL}/generations`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Hedra] Generation failed: ${response.status} ${errorText}`);
    throw new Error(`Hedra video generation failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Hedra] Generation created: ${data.id} (status: ${data.status})`);
  return data as HedraGenerationResponse;
}

// ── Check Video Status ──────────────────────────────────────────────────────

export async function getHedraVideoStatus(generationId: string): Promise<HedraStatusResponse> {
  const response = await fetch(`${HEDRA_BASE_URL}/generations/${generationId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hedra status check failed: ${response.status} — ${errorText}`);
  }

  return response.json() as Promise<HedraStatusResponse>;
}

// ── Get Asset (download URL) ────────────────────────────────────────────────

export async function getHedraAsset(assetId: string): Promise<HedraAsset> {
  const response = await fetch(`${HEDRA_BASE_URL}/assets/${assetId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hedra asset fetch failed: ${response.status} — ${errorText}`);
  }

  return response.json() as Promise<HedraAsset>;
}
