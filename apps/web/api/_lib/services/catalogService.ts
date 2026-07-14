import { getCache, withCache, type Cache } from '../cache/cache.js';
import { cacheKeys, CACHE_TTL_SECONDS } from '../cache/keys.js';
import type { BsaleCatalogRepository } from '../lib/bsale/products.js';
import type { ServiceEnricher } from '../lib/enrichment/seedEnricher.js';
import type { CatalogType, CatalogVariant, ListVariantsResult } from '../types/catalog.js';

export interface ListParams {
  limit: number;
  offset: number;
}

/**
 * Consolidates the former ListCatalogVariants/GetCatalogVariant use cases:
 * one method per operation, parameterized by catalog type. BSale results are
 * cached before enrichment (enrichment is deterministic and cheap).
 */
export class CatalogService {
  constructor(
    private readonly catalogRepository: BsaleCatalogRepository,
    private readonly enrichers: ServiceEnricher[],
    private readonly cache: Cache = getCache()
  ) {}

  async list(type: CatalogType, params: ListParams): Promise<ListVariantsResult> {
    const result = await withCache(
      this.cache,
      cacheKeys.catalogList(type, params.limit, params.offset),
      CACHE_TTL_SECONDS.catalogList,
      () => this.catalogRepository.listVariants({ ...params, type })
    );

    let items = result.items;
    for (const enricher of this.enrichers) {
      items = await enricher.enrich(items);
    }

    return { ...result, items };
  }

  async get(type: CatalogType, productId: number): Promise<CatalogVariant> {
    let variant = await withCache(
      this.cache,
      cacheKeys.catalogDetail(type, productId),
      CACHE_TTL_SECONDS.catalogDetail,
      () => this.catalogRepository.getVariantByProductId(productId, type)
    );

    for (const enricher of this.enrichers) {
      const [enriched] = await enricher.enrich([variant]);
      variant = enriched;
    }

    return variant;
  }
}
