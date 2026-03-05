// ============================================================
// lib/scraper.ts
// Scrapes perfume product pages and extracts structured data.
// Designed to work with Shopify, WooCommerce, and custom stores.
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

// ─── Olfactory notes extraction ──────────────────────────────────────────────────
function extractNotes(text: string): string {
  // Match patterns like "Top Notes: bergamot, lemon" in any language
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

  // ── Product Name ───────────────────────────────────────────────────────────────
  product.name = (
    getOGMeta($, 'og:title') ||
    $('h1.product-title, h1.product_title, h1[class*="title"], h1[itemprop="name"]').first().text() ||
    $('h1').first().text()
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 120);

  // ── Brand ──────────────────────────────────────────────────────────────────────
  product.brand = (
    $('[class*="brand"] a, [class*="vendor"] a, [itemprop="brand"]').first().text() ||
    $('[class*="brand"], [class*="vendor"]').first().text() ||
    getOGMeta($, 'og:site_name') ||
    $('meta[name="application-name"]').attr('content') ||
    ''
  )
    .trim()
    .substring(0, 80);

  // ── Description ───────────────────────────────────────────────────────────────
  product.description = (
    getOGMeta($, 'og:description') ||
    $('[class*="product-description"], [class*="description"], [itemprop="description"]')
      .first()
      .text() ||
    $('meta[name="description"]').attr('content') ||
    ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 800);

  // ── Main Product Image ─────────────────────────────────────────────────────────
  const rawImageUrl =
    getOGMeta($, 'og:image') ||
    $('[class*="product"] img[src], [class*="product-image"] img[src]').first().attr('src') ||
    $('img[itemprop="image"]').first().attr('src') ||
    '';

  product.imageUrl = resolveUrl(rawImageUrl, url);

  // ── Olfactory Notes ────────────────────────────────────────────────────────────
  product.notes = extractNotes(fullText) || extractNotes(product.description ?? '');

  // ── Gender ────────────────────────────────────────────────────────────────────
  product.gender = detectGender(fullText + ' ' + (product.name ?? '') + ' ' + (product.description ?? ''));

  // ── Price (bonus data) ────────────────────────────────────────────────────────
  product.price = (
    $('[class*="price"]:not([class*="compare"])').first().text() ||
    $('[itemprop="price"]').first().text() ||
    ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 30);

  return product;
}
