// ============================================================
// app/api/scrape/route.ts
// POST /api/scrape
// 1. Scrapes a perfume product URL for structured data
// 2. Uses Claude to determine ideal vibe + attire
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { scrapeProductPage } from '@/lib/scraper';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VIBE_OPTIONS = [
  'royal_luxury',
  'modern_corporate',
  'winter_cabin',
  'classic_library',
  'desert_sunset',
  'oriental_palace',
  'modern_minimalist',
  'ocean_breeze',
];

const ATTIRE_OPTIONS = [
  'white_thobe_black_bisht',
  'charcoal_suit_gold_tie',
  'white_thobe_only',
  'navy_suit',
  'beige_thobe_brown_bisht',
];

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required.' }, { status: 400 });
    }

    // ── Step 1: Scrape the product page ──────────────────────────────────────────
    const product = await scrapeProductPage(url);

    // ── Step 2: Claude analyzes the product and recommends vibe + attire ─────────
    const claudePrompt = `You are a luxury perfume brand marketing director with 20 years of experience.

Analyze this perfume product data and select the most visually compelling and commercially effective vibe and attire combination for a 3D CGI promotional image featuring an Arab male brand ambassador.

Product Data:
${JSON.stringify(product, null, 2)}

Available vibe options: ${VIBE_OPTIONS.join(', ')}
Available attire options: ${ATTIRE_OPTIONS.join(', ')}

Reasoning guide:
- Oud/oriental notes → oriental_palace or desert_sunset + white_thobe_black_bisht
- Fresh/aquatic/marine → ocean_breeze + navy_suit
- Woody/tobacco/leather → classic_library + charcoal_suit_gold_tie or white_thobe_black_bisht
- Citrus/green/sport → modern_corporate + navy_suit
- Vanilla/amber/warm → winter_cabin + beige_thobe_brown_bisht
- Ultra-luxury/royal → royal_luxury + white_thobe_black_bisht
- Minimalist/designer → modern_minimalist + white_thobe_only or charcoal_suit_gold_tie

Respond ONLY with a valid JSON object (no markdown fences, no extra text):
{
  "vibe": "<vibe_key>",
  "attire": "<attire_key>",
  "reasoning": "<one concise English sentence explaining the choice>"
}`;

    const analysisResponse = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: claudePrompt }],
    });

    const rawText =
      analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text.trim() : '{}';

    let recommendation = { vibe: 'royal_luxury', attire: 'white_thobe_black_bisht', reasoning: '' };
    try {
      recommendation = JSON.parse(rawText);
      // Validate that the returned values are in the allowed lists
      if (!VIBE_OPTIONS.includes(recommendation.vibe)) recommendation.vibe = 'royal_luxury';
      if (!ATTIRE_OPTIONS.includes(recommendation.attire)) recommendation.attire = 'white_thobe_black_bisht';
    } catch {
      console.warn('[/api/scrape] Failed to parse Claude recommendation, using defaults.');
    }

    return NextResponse.json({ product, recommendation }, { status: 200 });
  } catch (error: unknown) {
    console.error('[/api/scrape] Error:', error);
    const message = error instanceof Error ? error.message : 'Scraping failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
