/**
 * Content for the build-time prerender, loaded in-process through the same
 * service code the /api/v1 functions run (api/_lib/services/container.ts),
 * never by fetching our own deployed API.
 *
 * The shapes are exactly what the browser gets from /api/v1, so the embedded
 * window.__ONA_DATA__ equals what the pages refetch after mount:
 *   catalog.lodges / catalog.guides  = GET /api/v1/{lodges,guides}?limit=50&offset=0 → items
 *   details[].item                   = GET /api/v1/{lodges,guides}/:productId
 *   details[].reviews                = GET /api/v1/{lodges,guides}/:productId/reviews
 *   siteAssets                       = GET /api/v1/site/assets
 *
 * On Vercel (VERCEL=1) a failure to load live data fails the build, so Vercel
 * keeps serving the previous deployment. Locally, without the BSale/Postgres
 * env vars, it falls back to the bundled seed catalog with a loud warning.
 * PRERENDER_DATA=live|seed forces either source.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogType, Guide, Lodge } from '../api/_lib/types/catalog.js';
import type { ProductReviewsView } from '../api/_lib/types/reviews.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Same page the landing requests (src/pages/LandingPage.jsx). */
export const LANDING_PAGE_SIZE = 50;
const DETAIL_CONCURRENCY = 4;

export type ApiCatalogType = 'lodges' | 'guides';
export type ApiItem = Lodge | Guide;

export interface DetailData {
  catalogType: ApiCatalogType;
  item: ApiItem;
  reviews: ProductReviewsView;
}

export interface SiteData {
  source: 'live' | 'seed';
  siteAssets: { items: Record<string, unknown> };
  catalog: { lodges: ApiItem[]; guides: ApiItem[] };
  details: DetailData[];
}

const API_TYPE: Record<CatalogType, ApiCatalogType> = { lodge: 'lodges', guide: 'guides' };

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { statusCode?: number }).statusCode === 404);
}

/** Live data through the service layer, exactly as the API handlers build it. */
export async function loadLiveData(): Promise<SiteData> {
  // Read BSale and Postgres directly: a shared KV cache could hand the build
  // catalog data up to a few minutes old, right after the change that
  // triggered this rebuild.
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;

  const { getServices } = await import('../api/_lib/services/container.js');
  const mappers = await import('../api/_lib/utils/responseMappers.js');
  const services = getServices();

  async function listPage(type: CatalogType, offset: number) {
    const result = await services.catalogService.list(type, { limit: LANDING_PAGE_SIZE, offset });
    const mapped = type === 'lodge' ? mappers.toLodgeListResponse(result) : mappers.toGuideListResponse(result);
    const items =
      type === 'lodge'
        ? await mappers.attachLodgeReviewAggregates(mapped.items as Lodge[], services.reviewService)
        : await mappers.attachGuideReviewAggregates(mapped.items as Guide[], services.reviewService);
    return { items: items as ApiItem[], count: result.pagination.count };
  }

  async function listAll(type: CatalogType) {
    const first = await listPage(type, 0);
    const all = [...first.items];
    for (let offset = LANDING_PAGE_SIZE; offset < first.count; offset += LANDING_PAGE_SIZE) {
      all.push(...(await listPage(type, offset)).items);
    }
    return { landing: first.items, all };
  }

  async function loadDetail(type: CatalogType, productId: number): Promise<DetailData | null> {
    try {
      const variant = await services.catalogService.get(type, productId);
      const [item] =
        type === 'lodge'
          ? await mappers.attachLodgeReviewAggregates([mappers.mapCatalogVariantToLodge(variant)], services.reviewService)
          : await mappers.attachGuideReviewAggregates([mappers.mapCatalogVariantToGuide(variant)], services.reviewService);
      const reviews = await services.reviewService.listVisibleForProduct(type, productId);
      return { catalogType: API_TYPE[type], item, reviews };
    } catch (error) {
      // Listed but not fetchable (e.g. deactivated meanwhile): no page for it.
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  const [lodges, guides, published] = await Promise.all([
    listAll('lodge'),
    listAll('guide'),
    services.siteAssetService.getPublished()
  ]);

  const targets = [
    ...lodges.all.map((item) => ({ type: 'lodge' as const, productId: item.productId })),
    ...guides.all.map((item) => ({ type: 'guide' as const, productId: item.productId }))
  ];
  const details = (
    await mapLimited(targets, DETAIL_CONCURRENCY, (target) => loadDetail(target.type, target.productId))
  ).filter((detail): detail is DetailData => detail !== null);

  return {
    source: 'live',
    siteAssets: { items: published as unknown as Record<string, unknown> },
    catalog: { lodges: lodges.landing, guides: guides.landing },
    details
  };
}

interface SeedItem {
  productId?: number;
  name: string;
  zone?: number | string | null;
  phone?: string | null;
  email?: string | null;
  representative?: string | null;
  lat?: number | null;
  lng?: number | null;
  image?: string | null;
  gallery?: string[] | null;
}

function seedDescription(item: SeedItem, kind: string): string {
  return (
    `<p>[Descripción de ejemplo: build local sin BSale] ${item.name} es un ${kind} de pesca con mosca ` +
    `en el sur de Chile. En producción este texto viene de la ficha market_info del producto en BSale, ` +
    `y el prerender lo incluye en el HTML estático de esta página.</p>`
  );
}

/** API-shaped items from the bundled seed catalog (local builds only). */
function seedItem(item: SeedItem, type: CatalogType): ApiItem {
  const base = {
    productId: item.productId as number,
    name: item.name,
    description: item.productId != null ? seedDescription(item, type === 'lodge' ? 'lodge' : 'guía') : null,
    zone: item.zone == null ? null : ([Number(item.zone)] as Lodge['zone']),
    phone: item.phone ?? null,
    email: item.email ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    image: item.image ?? null,
    gallery: item.gallery ?? null,
    // Like the API: ratings come from visible reviews only, and the seed has none.
    rating: null,
    reviews: 0,
    ratingLabel: null,
    referencePrice: null
  };
  return type === 'lodge' ? { ...base, representative: item.representative ?? null } : base;
}

export function loadSeedData(): SiteData {
  const seed = JSON.parse(
    readFileSync(resolve(__dirname, '../api/_lib/lib/enrichment/catalog-seed.json'), 'utf8')
  ) as { lodges: SeedItem[]; guides: SeedItem[] };
  const lodges = seed.lodges.map((item) => seedItem(item, 'lodge'));
  const guides = seed.guides.map((item) => seedItem(item, 'guide'));
  const emptyReviews: ProductReviewsView = { average: null, count: 0, items: [] };
  const details: DetailData[] = [
    ...lodges.filter((item) => item.productId != null).map((item) => ({ catalogType: 'lodges' as const, item, reviews: emptyReviews })),
    ...guides.filter((item) => item.productId != null).map((item) => ({ catalogType: 'guides' as const, item, reviews: emptyReviews }))
  ];
  return {
    source: 'seed',
    siteAssets: { items: { hero: null, hero_poster: null, logo: null } },
    catalog: { lodges: lodges.slice(0, LANDING_PAGE_SIZE), guides: guides.slice(0, LANDING_PAGE_SIZE) },
    details
  };
}

function warnSeed(reason: string): void {
  const line = '!'.repeat(78);
  console.warn(
    [
      '',
      line,
      '!! PRERENDER: USING SEED DATA, NOT BSALE/POSTGRES',
      `!! ${reason}`,
      '!! The HTML in dist/ has placeholder descriptions and no reviews. Fine for',
      '!! local development; never deploy it. (On Vercel this fails the build.)',
      line,
      ''
    ].join('\n')
  );
}

/** Live data on Vercel (or with PRERENDER_DATA=live), else the seed fallback. */
export async function loadSiteData(env: NodeJS.ProcessEnv = process.env): Promise<SiteData> {
  const onVercel = env.VERCEL === '1';
  const mode = env.PRERENDER_DATA;
  const requireLive = mode === 'live' || (onVercel && mode !== 'seed');

  if (mode === 'seed') {
    if (onVercel) throw new Error('PRERENDER_DATA=seed is not allowed on Vercel builds.');
    warnSeed('PRERENDER_DATA=seed');
    return loadSeedData();
  }

  try {
    const data = await loadLiveData();
    if (data.catalog.lodges.length === 0 && data.catalog.guides.length === 0) {
      throw new Error('BSale returned no lodges and no guides; refusing to publish an empty catalog.');
    }
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (requireLive) {
      throw new Error(
        `Prerender could not load live content (BSale/Postgres): ${message}\n` +
          'The build fails on purpose so Vercel keeps serving the previous deployment. ' +
          'Check that the BSALE_*, POSTGRES_URL and other API env vars are available to the Build step.'
      );
    }
    warnSeed(`Live data unavailable: ${message.split('\n')[0]}`);
    return loadSeedData();
  }
}
