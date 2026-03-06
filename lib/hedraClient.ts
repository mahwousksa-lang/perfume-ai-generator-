// ============================================================
// lib/hedraClient.ts
// Client for interacting with the Hedra API to generate videos.
//
// FIX v3: Correct request structure based on official Hedra starter:
//   - generated_video_inputs has NO ai_model_id (it's at root level)
//   - audio_generation has NO model_id (just type, voice_id, text)
//   - Use start_keyframe_id (uploaded asset) instead of URL
//   - Default model: d1dd37a3-e39a-4854-a298-6510289f9cf2 (Hedra Avatar)
// ============================================================

const HEDRA_API_KEY = process.env.HEDRA_API_KEY;
const HEDRA_BASE_URL = "https://api.hedra.com/web-app/public";

// ── Arabic Voice ────────────────────────────────────────────────────────────
export const ARABIC_VOICE_ID = "61d27b32-834c-4797-b9ff-4b0febed07f6"; // Omar (عمر)

// ── Video Models ────────────────────────────────────────────────────────────
// Official default model from hedra-api-starter (hardcoded in their example)
export const HEDRA_DEFAULT_MODEL = "d1dd37a3-e39a-4854-a298-6510289f9cf2";
// Hedra Avatar model
export const HEDRA_AVATAR_MODEL = "26f0fc66-152b-40ab-abed-76c43df99bc8";

// ── Types ───────────────────────────────────────────────────────────────────

export type VideoAspectRatio = "9:16" | "16:9" | "1:1";

export interface HedraGenerationResponse {
  id: string;
  status: "pending" | "processing" | "complete" | "failed" | "error";
  asset_id?: string;
  progress?: number;
  eta_sec?: number;
  error?: string;
  url?: string;
}

export interface HedraStatusResponse {
  id: string;
  status: "pending" | "processing" | "complete" | "failed" | "error";
  asset_id?: string;
  progress?: number;
  eta_sec?: number;
  error?: string;
  url?: string;
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
// Converts base64 data URLs or long URLs into a Hedra asset ID
// to avoid the 2083-character URL limit on start_keyframe_url.

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
  console.log(`[Hedra] Uploading image as asset (URL length: ${imageUrl.length})`);

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

  // Step 3: Upload the image file using multipart/form-data
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

  console.log(`[Hedra] Image uploaded successfully. Asset ID: ${assetId}`);
  return assetId;
}

// ── Create Video Generation ─────────────────────────────────────────────────
// Based on official hedra-api-starter structure:
// {
//   type: "video",
//   ai_model_id: "...",           ← at ROOT level
//   start_keyframe_id: "...",     ← uploaded asset ID
//   generated_video_inputs: {    ← NO ai_model_id here
//     text_prompt: "...",
//     resolution: "720p",
//     aspect_ratio: "9:16",
//     duration_ms: 10000,
//   },
//   audio_generation: {          ← NO model_id here
//     type: "text_to_speech",
//     voice_id: "...",
//     text: "...",
//   }
// }

export async function createHedraVideo(params: {
  imageUrl: string;
  textPrompt: string;
  voiceoverText: string;
  aspectRatio: VideoAspectRatio;
  durationMs?: number;
}): Promise<HedraGenerationResponse> {
  const { imageUrl, textPrompt, voiceoverText, aspectRatio, durationMs = 10000 } = params;

  // Always upload image as asset (handles both base64 and long URLs)
  const startKeyframeId = await uploadImageToHedra(imageUrl);

  // Build request body — EXACT structure from official hedra-api-starter
  const body: Record<string, unknown> = {
    type: "video",
    ai_model_id: HEDRA_AVATAR_MODEL,  // at root level
    start_keyframe_id: startKeyframeId,
    generated_video_inputs: {
      text_prompt: textPrompt,
      resolution: "720p",
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

  console.log(`[Hedra] Creating ${aspectRatio} video`);
  console.log(`[Hedra] Model: ${HEDRA_AVATAR_MODEL}`);
  console.log(`[Hedra] Keyframe ID: ${startKeyframeId}`);
  console.log(`[Hedra] Voice ID: ${ARABIC_VOICE_ID}`);
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
  const response = await fetch(`${HEDRA_BASE_URL}/generations/${generationId}/status`, {
    headers: getApiKeyHeader(),
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
    headers: getApiKeyHeader(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hedra asset fetch failed: ${response.status} — ${errorText}`);
  }

  return response.json() as Promise<HedraAsset>;
}
