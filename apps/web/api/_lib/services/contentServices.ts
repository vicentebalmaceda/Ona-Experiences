import { getCache } from '../cache/cache.js';
import type { ContentEnv } from '../config/env.js';
import { getSql } from '../db/postgres.js';
import { UnconfiguredBlobStorage } from '../lib/blob/blobStorage.js';
import { BsaleClient } from '../lib/bsale/client.js';
import { BsaleMarketInfoRepository } from '../lib/bsale/marketInfo.js';
import { BsaleCatalogRepository, BsaleProductTypeResolver } from '../lib/bsale/products.js';
import { MarketInfoEnricher } from '../lib/enrichment/marketInfoEnricher.js';
import { SeedServiceEnricher } from '../lib/enrichment/seedEnricher.js';
import { createTranslator } from '../lib/translation/googleTranslator.js';
import { PostgresTranslationStore } from '../lib/translation/postgresTranslationStore.js';
import { PostgresReviewStore } from '../lib/reviews/postgresReviewStore.js';
import { PostgresSiteAssetStore } from '../lib/siteAssets/postgresSiteAssetStore.js';
import { CatalogService } from './catalogService.js';
import { DescriptionTranslationService } from './descriptionTranslationService.js';
import { ReviewReader } from './reviewService.js';
import { SiteAssetService } from './siteAssetService.js';

export interface ContentServices {
  catalogService: CatalogService;
  descriptionTranslations: DescriptionTranslationService;
  reviewReader: ReviewReader;
  siteAssetService: SiteAssetService;
}

/**
 * Composition for public content (catalog, description translations, Visible
 * Reviews, site assets), wired exactly like container.ts but from ContentEnv
 * only: BSale token/base URL/product type names, POSTGRES_URL and the optional
 * translation key. Used by the build-time prerender, which must not depend on
 * mail or admin secrets. Read-only except for storing new translations.
 */
export function createContentServices(env: ContentEnv): ContentServices {
  const client = new BsaleClient(env);
  const productTypeResolver = new BsaleProductTypeResolver(client, env);
  const catalogRepository = new BsaleCatalogRepository(client, productTypeResolver);
  const sql = getSql(env.POSTGRES_URL);
  return {
    // Same enricher order as container.ts: BSale market_info first, seed fills gaps.
    catalogService: new CatalogService(catalogRepository, [
      new MarketInfoEnricher(new BsaleMarketInfoRepository(client)),
      new SeedServiceEnricher()
    ]),
    descriptionTranslations: new DescriptionTranslationService({
      store: new PostgresTranslationStore(sql),
      translator: createTranslator(env.GOOGLE_TRANSLATE_API_KEY)
    }),
    reviewReader: new ReviewReader(new PostgresReviewStore(sql)),
    // Reads only: no Blob token needed to list what is published.
    siteAssetService: new SiteAssetService({
      store: new PostgresSiteAssetStore(sql),
      blob: new UnconfiguredBlobStorage(),
      cache: getCache()
    })
  };
}
