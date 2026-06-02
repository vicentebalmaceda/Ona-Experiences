import type { CatalogVariant } from '../entities/CatalogVariant.js';

export interface ServiceEnricher {
  enrich(variants: CatalogVariant[]): Promise<CatalogVariant[]>;
}
