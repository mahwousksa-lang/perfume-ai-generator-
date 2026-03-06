// @ts-nocheck
// ============================================================
// lib/scraper.ts
// Scrapes perfume product pages and extracts structured data.
// Optimized for mahwous.com and other e-commerce stores.
// ============================================================

import * as cheerio from 'cheerio';
import type { ScrapedProduct } from './types';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
};

// ─── Open Graph helpers ──────────────────────────────────────────────────────────
function getOGMeta($: cheerio.CheerioAPI, property: string): string {
  return (
    $(`meta[property="${property}"]`).attr('content') ??
    $(`meta[name="${property}"]`).attr('content') ??
    ''
  );
}

// ─── Resolve relative URLs ───────────────────────────────────────────────────────
function resolveUrl(href: string | undefined, baseUrl: string): string {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

// ─── Gender detection ────────────────────────────────────────────────────────────
function detectGender(text: string): 'men' | 'women' | 'unisex' {
  const lower = text.toLowerCase();
  const menKeywords = ['for men', 'homme', 'pour homme', 'للرجال', 'رجالي', "men's", 'masculine'];
  const womenKeywords = ['for women', 'femme', 'pour femme', 'للنساء', 'نسائي', "women's", 'feminine'];

  if (menKeywords.some((k) => lower.includes(k))) return 'men';
  if (womenKeywords.some((k) => lower.includes(k))) return 'women';
  return 'unisex';
}

// ─── Olfactory notes extraction (optimized for mahwous.com) ──────────────────
function extractNotes(text: string, $: cheerio.CheerioAPI): string {
  const notes: string[] = [];

  // Strategy 1: Look for specific mahwous.com structure
  $('p:contains("المكونات العليا"), p:contains("مقدمة العطر")').next('p').each((i, el) => {
    notes.push(`Top: ${$(el).text().trim()}`);
  });
  $('p:contains("المكونات الوسطى"), p:contains("قلب العطر")').next('p').each((i, el) => {
    notes.push(`Heart: ${$(el).text().trim()}`);
  });
  $('p:contains("المكونات الأساسية"), p:contains("قاعدة العطر")').next('p').each((i, el) => {
    notes.push(`Base: ${$(el).text().trim()}`);
  });

  if (notes.length > 0) {
    return notes.join(' • ');
  }

  // Strategy 2: Generic patterns as fallback
  const patterns = [
    /(?:top notes?|heart notes?|base notes?|middle notes?|olfactory notes?|notes?)[:\s]+([^\n.;<]{5,200})/gi,
    /(?:رائحة|نوتات|مقدمة|قلب|قاعدة)[:\s]+([^\n.;<]{5,100})/gi,
    /(?:bergamot|sandalwood|oud|musk|rose|jasmine|cedar|amber|vanilla|patchouli)[^.;,\n]{0,100}/gi,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const note = (match[1] ?? match[0]).trim();
      if (note.length > 3 && !found.includes(note)) {
        found.push(note);
      }
    }
    pattern.lastIndex = 0;
  }

  return found.slice(0, 6).join(' • ');
}

// ─── Main scraper ────────────────────────────────────────────────────────────────
export async function scrapeProductPage(url: string): Promise<ScrapedProduct> {
  const response = await fetch(url, { headers: DEFAULT_HEADERS });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — Failed to fetch: ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const product: ScrapedProduct = {};
  const fullText = $('body').text().replace(/\s+/g, ' ');

  // ── Product Name (optimized for mahwous.com) ──────────────────────────────────
  product.name = (
    $('.product-details__title').first().text() ||
    getOGMeta($, 'og:title') ||
    $('h1').first().text()
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 120);

  // ── Brand (optimized for mahwous.com) ──────────────────────────────────────────
  product.brand = (
    $('.product-details__brand a').first().text() ||
    getOGMeta($, 'og:site_name') ||
    'mahwous'
  )
    .trim()
    .substring(0, 80);

  // ── Description (optimized for mahwous.com) ──────────────────────────────────
  product.description = (
    $('.product-details__description').text() ||
    getOGMeta($, 'og:description') ||
    $('meta[name="description"]').attr('content') ||
    ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 1500);

  // ── Main Product Image (optimized for mahwous.com) ─────────────────────────────
  const rawImageUrl =
    $('.main-product-image-container img').attr('src') ||
    getOGMeta($, 'og:image') ||
    '';

  product.imageUrl = resolveUrl(rawImageUrl, url);

  // ── Olfactory Notes ────────────────────────────────────────────────────────────
  product.notes = extractNotes(fullText, $);

  // ── Gender ────────────────────────────────────────────────────────────────────
  product.gender = detectGender(fullText + ' ' + (product.name ?? '') + ' ' + (product.description ?? ''));

  // ── Price (optimized for mahwous.com) ────────────────────────────────────────
  product.price = (
    $('.product-price').first().text() ||
    ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 30);

  return product;
}
