import type { CatalogVariant } from '../../domain/entities/CatalogVariant.js';
import type { ServiceEnricher } from '../../domain/ports/ServiceEnricher.js';

export class NoOpServiceEnricher implements ServiceEnricher {
  async enrich(variants: CatalogVariant[]): Promise<CatalogVariant[]> {
    return variants;
  }
}
