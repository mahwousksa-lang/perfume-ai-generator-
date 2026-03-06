// ============================================================
// lib/hedraClient.ts
// Client for interacting with the Hedra API to generate videos.
// Uses the verified API endpoints and parameters.
//
// FIX v2: Upload image as Hedra asset first, then use
//   start_keyframe_id instead of start_keyframe_url to avoid
//   the 2083-character URL limit.
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
  start_keyframe_id?: string;
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
  asset?: {
    url?: string;
    type?: string;
    width?: number;
    height?: number;
  };
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

function getApiKeyHeader(): Record<string, string> {
  if (!HEDRA_API_KEY) {
    throw new Error("HEDRA_API_KEY is not set in environment variables.");
  }
  return {
    "X-API-Key": HEDRA_API_KEY,
  };
}

// ── Upload Image to Hedra as Asset ─────────────────────────────────────────
// This solves the URL-too-long error (max 2083 chars) by uploading the image
// directly to Hedra and using start_keyframe_id instead of start_keyframe_url.

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  // Handle base64 data URLs
  if (imageUrl.startsWith("data:")) {
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }

  // Handle regular URLs
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadImageToHedra(imageUrl: string): Promise<string> {
  console.log(`[Hedra] Uploading image to Hedra assets...`);
  console.log(`[Hedra] Image URL length: ${imageUrl.length} chars`);

  // Step 1: Create asset placeholder
  const createResponse = await fetch(`${HEDRA_BASE_URL}/assets`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: `perfume_keyframe_${Date.now()}.jpg`,
      type: "image",
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Hedra create asset failed: ${createResponse.status} — ${errText}`);
  }

  const createData = await createResponse.json();
  const assetId: string = createData.id;
  console.log(`[Hedra] Asset created: ${assetId}`);

  // Step 2: Download the image into a buffer
  const imageBuffer = await fetchImageBuffer(imageUrl);
  console.log(`[Hedra] Image buffer size: ${imageBuffer.length} bytes`);

  // Step 3: Upload the image file to the asset using multipart/form-data
  // We need to construct a multipart form manually since we're in Node.js
  const boundary = `----HedraUpload${Date.now()}`;
  const fileName = `perfume_keyframe_${Date.now()}.jpg`;

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const multipartBody = Buffer.concat([header, imageBuffer, footer]);

  const uploadResponse = await fetch(`${HEDRA_BASE_URL}/assets/${assetId}/upload`, {
    method: "POST",
    headers: {
      ...getApiKeyHeader(),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`Hedra upload asset failed: ${uploadResponse.status} — ${errText}`);
  }

  const uploadData = await uploadResponse.json();
  console.log(`[Hedra] Image uploaded successfully. Asset ID: ${assetId}`);
  console.log(`[Hedra] Asset URL: ${uploadData?.asset?.url?.substring(0, 80) ?? "N/A"}...`);

  return assetId;
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

  // Determine whether to use asset upload or direct URL
  const isLongUrl = imageUrl.length > 2000 || imageUrl.startsWith("data:");

  let startKeyframeId: string | undefined;
  let startKeyframeUrl: string | undefined;

  if (isLongUrl) {
    // Upload image to Hedra first, then use asset ID
    console.log(`[Hedra] URL too long (${imageUrl.length} chars) — uploading as asset`);
    startKeyframeId = await uploadImageToHedra(imageUrl);
  } else {
    // Use direct URL (short enough)
    startKeyframeUrl = imageUrl;
  }

  // Build request body
  const body: HedraGenerationRequest = {
    type: "video",
    ai_model_id: HEDRA_AVATAR_MODEL,
    generated_video_inputs: {
      text_prompt: textPrompt,
      aspect_ratio: aspectRatio,
      duration_ms: durationMs,
      enhance_prompt: false,
    },
    audio_generation: {
      type: "text_to_speech",
      voice_id: ARABIC_VOICE_ID,
      text: voiceoverText,
      language: "auto",
    },
  };

  // Set the keyframe source
  if (startKeyframeId) {
    body.start_keyframe_id = startKeyframeId;
    console.log(`[Hedra] Using start_keyframe_id: ${startKeyframeId}`);
  } else if (startKeyframeUrl) {
    body.start_keyframe_url = startKeyframeUrl;
    console.log(`[Hedra] Using start_keyframe_url: ${startKeyframeUrl.substring(0, 80)}...`);
  }

  console.log(`[Hedra] Creating ${aspectRatio} video with model ${HEDRA_AVATAR_MODEL}`);
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
