/**
 * Pure helpers that turn API answers (live, or embedded by the prerender as
 * window.__ONA_DATA__) into what the pages render and what the head shows.
 * The pages, DocumentMeta and the server entry all go through these, so the
 * server render, the first client render and the head agree.
 */
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { mergeSingleWithSeed, mergeWithSeed } from '../utils/catalogMerge.js';
import { SLOT_RULES } from '../../shared/siteAssetSlots.ts';

export const CATALOG_TYPES = {
  lodges: { internalLabel: 'Lodge', seed: seedLodges, pageId: 'lodge' },
  guides: { internalLabel: 'Guía', seed: seedGuides, pageId: 'guide' }
};

export const EMPTY_REVIEWS = Object.freeze({ average: null, count: 0, items: [] });

/** Landing lists from the API list items: seed presentation filled in, internal type codes set. */
export function landingItems(apiLodges, apiGuides) {
  return {
    lodgeItems: mergeWithSeed(apiLodges ?? [], seedLodges).map(item => ({ ...item, type: 'Lodge' })),
    guideItems: mergeWithSeed(apiGuides ?? [], seedGuides).map(item => ({ ...item, type: 'Guía' }))
  };
}

/** The detail page's item from the API item. */
export function detailItem(apiItem, catalogType) {
  const { seed, internalLabel } = CATALOG_TYPES[catalogType];
  return { ...mergeSingleWithSeed(apiItem, seed), type: internalLabel };
}

/** The embedded detail data when it is for this product, else null. */
export function initialDetailFor(data, catalogType, productId) {
  const detail = data?.detail;
  if (!detail || !detail.item || productId == null) return null;
  if (detail.catalogType !== catalogType) return null;
  return String(detail.item.productId) === String(productId) ? detail : null;
}

/** Same-content check used when revalidating, so unchanged data keeps its identity (no re-render). */
export function sameData(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function defaultAsset(rules) {
  return { kind: rules.defaultKind, url: rules.defaultUrl, alt: null, width: null, height: null, isDefault: true };
}

export function defaultSiteAssets() {
  return Object.fromEntries(Object.entries(SLOT_RULES).map(([slot, rules]) => [slot, defaultAsset(rules)]));
}

/** Merge the API answer (null = default) over the bundled defaults. */
export function mergePublished(items) {
  const merged = defaultSiteAssets();
  if (!items || typeof items !== 'object') return merged;
  for (const slot of Object.keys(merged)) {
    const published = items[slot];
    if (published && typeof published.url === 'string' && published.url) {
      merged[slot] = {
        kind: published.kind === 'video' ? 'video' : 'image',
        url: published.url,
        alt: published.alt ?? null,
        width: published.width ?? null,
        height: published.height ?? null,
        isDefault: false
      };
    }
  }
  return merged;
}

/**
 * The hero's still image (the LCP element): the poster under a video, else
 * the hero image itself. Null when nothing is published.
 */
export function heroStillUrl(hero, poster) {
  const isVideo = hero?.kind === 'video' && hero?.url;
  return (isVideo ? poster?.url : hero?.url) || null;
}

/**
 * buildHead inputs known from the embedded data: the detail item and its
 * reviews, the landing's lodges, the hero still and the logo.
 */
export function headInputFromInitialData(data) {
  if (!data) return {};
  const assets = mergePublished(data.siteAssets?.items);
  const input = {
    heroImage: heroStillUrl(assets.hero, assets.hero_poster),
    logoUrl: assets.logo.url
  };
  if (data.detail?.item && CATALOG_TYPES[data.detail.catalogType]) {
    input.item = detailItem(data.detail.item, data.detail.catalogType);
    input.reviews = data.detail.reviews ?? EMPTY_REVIEWS;
  }
  if (data.catalog) {
    input.lodges = landingItems(data.catalog.lodges, data.catalog.guides).lodgeItems;
  }
  return input;
}
