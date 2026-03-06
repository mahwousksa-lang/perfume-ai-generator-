// ============================================================
// lib/hedraClient.ts
// Client for interacting with the Hedra API to generate videos.
// ============================================================

import type { GeneratedImage } from "./types";

const HEDRA_API_KEY = process.env.HEDRA_API_KEY;
const HEDRA_API_URL = "https://api.hedra.com/v1/videos";

interface HedraVideoRequest {
  image: GeneratedImage;
  prompt: string; // The scenario/action for the video
  voice: string; // The voiceover text
}

interface HedraVideoResponse {
  id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  url?: string;
  error?: string;
}

export async function createHedraVideo(req: HedraVideoRequest): Promise<HedraVideoResponse> {
  if (!HEDRA_API_KEY) {
    throw new Error("HEDRA_API_KEY is not set.");
  }

  const payload = {
    image_url: req.image.url,
    prompt: req.prompt,
    voice_prompt: req.voice,
    character_id: "mahwous-v2", // Assuming a pre-registered character ID
    voice_id: "ar-SA-Wavenet-D", // Example Saudi Arabic voice
    duration: 15, // Default duration in seconds
  };

  const response = await fetch(HEDRA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HEDRA_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create Hedra video.");
  }

  return response.json() as Promise<HedraVideoResponse>;
}

export async function getHedraVideoStatus(videoId: string): Promise<HedraVideoResponse> {
  if (!HEDRA_API_KEY) {
    throw new Error("HEDRA_API_KEY is not set.");
  }

  const response = await fetch(`${HEDRA_API_URL}/${videoId}`, {
    headers: {
      "Authorization": `Bearer ${HEDRA_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get Hedra video status.");
  }

  return response.json() as Promise<HedraVideoResponse>;
}
