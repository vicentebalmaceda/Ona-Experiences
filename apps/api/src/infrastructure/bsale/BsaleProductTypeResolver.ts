import type { Env } from '../../config/env.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import { createLogger } from '../../shared/logger.js';
import { BsaleHttpClient, type BsaleListResponse } from './BsaleHttpClient.js';
import type { BsaleProductType } from './types.js';

const log = createLogger('bsale');

interface CacheEntry {
  id: number;
  expiresAt: number;
}

export class BsaleProductTypeResolver {
  private readonly cache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(
    private readonly client: BsaleHttpClient,
    private readonly env: Env
  ) {}

  async resolveIdByName(name: string): Promise<number> {
    const cacheKey = name.toUpperCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      log.debug('Product type resolved from cache', { name, id: cached.id });
      return cached.id;
    }

    const response = await this.client.get<BsaleListResponse<BsaleProductType>>('/product_types.json', {
      name,
      state: 0
    });

    const matches = response.items.filter((item) => item.state === 0);
    if (matches.length === 0) {
      throw new DomainError(`Product type not found: ${name}`, 404, 'PRODUCT_TYPE_NOT_FOUND');
    }

    if (matches.length > 1) {
      log.warn('Multiple product types matched name; using first active match', {
        name,
        matchCount: matches.length,
        ids: matches.map((item) => item.id)
      });
    }

    const productTypeId = matches[0].id;
    this.cache.set(cacheKey, {
      id: productTypeId,
      expiresAt: Date.now() + BsaleProductTypeResolver.CACHE_TTL_MS
    });

    log.debug('Product type resolved', { name, id: productTypeId });
    return productTypeId;
  }

  getProductTypeName(type: 'lodge' | 'guide'): string {
    return type === 'lodge'
      ? this.env.BSALE_LODGE_PRODUCT_TYPE_NAME
      : this.env.BSALE_GUIDE_PRODUCT_TYPE_NAME;
  }
}
