import type { CatalogType } from '../types/catalog';

export const CACHE_PREFIX = {
  productType: 'bsale:productType:',
  catalog: 'catalog:',
  pricing: 'pricing:'
} as const;

export const CACHE_TTL_SECONDS = {
  productType: 10 * 60,
  catalogList: 3 * 60,
  catalogDetail: 3 * 60,
  pricing: 5 * 60
} as const;

export const cacheKeys = {
  productType: (name: string) => `${CACHE_PREFIX.productType}${name.toUpperCase()}`,
  catalogList: (type: CatalogType, limit: number, offset: number) =>
    `${CACHE_PREFIX.catalog}list:${type}:${limit}:${offset}`,
  catalogDetail: (type: CatalogType, productId: number) =>
    `${CACHE_PREFIX.catalog}detail:${type}:${productId}`,
  pricing: (variantId: number) => `${CACHE_PREFIX.pricing}${variantId}`
};
