// @ts-nocheck
// ============================================================
// lib/scraper.ts
// Scrapes perfume product pages and extracts structured data.
// Optimized for mahwous.com (Salla-based store).
// ============================================================

import * as cheerio from 'cheerio';
import type { ScrapedProduct } from './types';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ar,en;q=0.9',
  'Cache-Control': 'no-cache',
};

function getOGMeta($: cheerio.CheerioAPI, property: string): string {
  return (
    $(`meta[property="${property}"]`).attr('content') ??
    $(`meta[name="${property}"]`).attr('content') ??
    ''
  );
}

function resolveUrl(href: string | undefined, baseUrl: string): string {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function detectGender(text: string): 'men' | 'women' | 'unisex' {
  const lower = text.toLowerCase();
  if (/for men|homme|pour homme|للرجال|رجالي|masculine/.test(lower)) return 'men';
  if (/for women|femme|pour femme|للنساء|نسائي|feminine/.test(lower)) return 'women';
  return 'unisex';
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

  // ── Product Name ──────────────────────────────────────────────────────────────
  // mahwous.com uses h1 directly or og:title
  product.name = (
    $('h1').first().text().trim() ||
    getOGMeta($, 'og:title') ||
    $('title').text().split('|')[0].trim()
  )
    .replace(/\s+/g, ' ')
    .substring(0, 150);

  // ── Brand — Extract from page content ─────────────────────────────────────────
  // mahwous.com shows brand in a link with hint="brand" or in product details table
  let brand = '';

  // Try: link with brand hint (mahwous.com specific)
  $('a[hint="brand"]').each((_, el) => {
    const t = $(el).text().trim();
    // Skip if it contains Arabic text mixed with other content (take only clean brand name)
    if (t && t.length < 60 && !/الجنس|نوع|الشخصية|العائلة/.test(t)) {
      brand = t.split(/\n/)[0].trim(); // take first line only
      return false;
    }
  });

  // Try: product details list — look for "العلامة التجارية"
  if (!brand) {
    $('li, p, span, div').each((_, el) => {
      const text = $(el).text();
      const match = text.match(/العلامة التجارية[:\s]+([^\n,،]+)/);
      if (match) {
        brand = match[1].trim().substring(0, 80);
        return false; // break
      }
    });
  }

  // Try: extract brand from product name (e.g., "Dior JOY" → "Dior")
  if (!brand && product.name) {
    // Common brand patterns in Arabic product names
    const brandMatch = product.name.match(/\|\s*([A-Za-z][A-Za-z\s&]+?)(?:\s+\d|$)/);
    if (brandMatch) brand = brandMatch[1].trim();
  }

  // Try: og:site_name
  if (!brand) brand = getOGMeta($, 'og:site_name');

  product.brand = brand || 'مهووس';

  // ── Description ───────────────────────────────────────────────────────────────
  product.description = (
    getOGMeta($, 'og:description') ||
    $('meta[name="description"]').attr('content') ||
    ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 1500);

  // ── Full page text for notes extraction ───────────────────────────────────────
  const fullText = $('body').text().replace(/\s+/g, ' ');

  // ── Olfactory Notes — mahwous.com specific ────────────────────────────────────
  const notes: string[] = [];

  // Strategy 1: Look for structured notes in page text
  const topMatch = fullText.match(/المكونات العليا[:\s]+([^.،\n]{5,150})/);
  const heartMatch = fullText.match(/المكونات الوسطى[:\s]+([^.،\n]{5,150})/);
  const baseMatch = fullText.match(/المكونات الأساسية[:\s]+([^.،\n]{5,150})/);

  if (topMatch) notes.push(`رأسية: ${topMatch[1].trim()}`);
  if (heartMatch) notes.push(`قلبية: ${heartMatch[1].trim()}`);
  if (baseMatch) notes.push(`قاعدية: ${baseMatch[1].trim()}`);

  // Strategy 2: English notes
  if (notes.length === 0) {
    const enTopMatch = fullText.match(/top notes?[:\s]+([^.;<\n]{5,150})/i);
    const enHeartMatch = fullText.match(/(?:heart|middle) notes?[:\s]+([^.;<\n]{5,150})/i);
    const enBaseMatch = fullText.match(/base notes?[:\s]+([^.;<\n]{5,150})/i);
    if (enTopMatch) notes.push(`Top: ${enTopMatch[1].trim()}`);
    if (enHeartMatch) notes.push(`Heart: ${enHeartMatch[1].trim()}`);
    if (enBaseMatch) notes.push(`Base: ${enBaseMatch[1].trim()}`);
  }

  // Strategy 3: Detect known ingredients
  if (notes.length === 0) {
    const knownIngredients = [
      'bergamot', 'sandalwood', 'oud', 'musk', 'rose', 'jasmine', 'cedar', 'amber',
      'vanilla', 'patchouli', 'vetiver', 'iris', 'neroli', 'ylang', 'tonka',
      'ورد', 'ياسمين', 'عود', 'مسك', 'صندل', 'عنبر', 'فانيليا', 'باتشولي',
    ];
    const found = knownIngredients.filter((ing) =>
      fullText.toLowerCase().includes(ing.toLowerCase())
    );
    if (found.length > 0) notes.push(found.slice(0, 8).join('، '));
  }

  product.notes = notes.join(' • ') || '';

  // ── Gender ────────────────────────────────────────────────────────────────────
  // Check page content for gender
  const genderMatch = fullText.match(/الجنس[:\s]+([^\n،,]{2,20})/);
  if (genderMatch) {
    const g = genderMatch[1].trim();
    if (/نسائي|للنساء|women/i.test(g)) product.gender = 'women';
    else if (/رجالي|للرجال|men/i.test(g)) product.gender = 'men';
    else product.gender = 'unisex';
  } else {
    product.gender = detectGender(fullText + ' ' + (product.name ?? ''));
  }

  // ── Price ─────────────────────────────────────────────────────────────────────
  // mahwous.com shows price in various formats
  let price = '';

  // Try: JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const offers = data.offers || data['@graph']?.find((g: any) => g.offers)?.offers;
      if (offers?.price) {
        price = `${offers.price} ${offers.priceCurrency || 'SAR'}`;
        return false;
      }
    } catch { /* ignore */ }
  });

  // Try: og:price:amount
  if (!price) {
    const priceAmount = getOGMeta($, 'product:price:amount') || getOGMeta($, 'og:price:amount');
    const priceCurrency = getOGMeta($, 'product:price:currency') || 'SAR';
    if (priceAmount) price = `${priceAmount} ${priceCurrency}`;
  }

  // Try: text pattern
  if (!price) {
    const priceMatch = fullText.match(/(\d{2,4})\s*(?:ر\.س|SAR|ريال|﷼)/);
    if (priceMatch) price = `${priceMatch[1]} ريال`;
  }

  product.price = price.trim().substring(0, 30);

  // ── Main Product Image ─────────────────────────────────────────────────────────
  // Try og:image first (usually the best quality)
  let imageUrl = getOGMeta($, 'og:image');

  // Try: product image containers
  if (!imageUrl) {
    imageUrl =
      $('img.product-image, img[class*="product"], .product-gallery img, .main-product-image-container img')
        .first()
        .attr('src') || '';
  }

  // Try: largest image on page
  if (!imageUrl) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const width = parseInt($(el).attr('width') || '0');
      if (width > 300 && src.includes('cdn')) {
        imageUrl = src;
        return false;
      }
    });
  }

  product.imageUrl = resolveUrl(imageUrl, url);

  // ── Volume ────────────────────────────────────────────────────────────────────
  const volumeMatch = (product.name + ' ' + fullText).match(/(\d+)\s*(?:ml|مل)/i);
  if (volumeMatch) product.volume = `${volumeMatch[1]}ml`;

  return product;
}
