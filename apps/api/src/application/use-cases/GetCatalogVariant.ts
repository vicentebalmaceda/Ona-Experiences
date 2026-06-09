import type { CatalogVariant, ServiceType } from '../../domain/entities/CatalogVariant.js';
import type { CatalogRepository } from '../../domain/ports/CatalogRepository.js';
import type { ServiceEnricher } from '../../domain/ports/ServiceEnricher.js';

export interface GetCatalogVariantParams {
  productId: number;
  type: 'lodge' | 'guide';
}

export class GetCatalogVariant {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly enrichers: ServiceEnricher[]
  ) {}

  async execute(params: GetCatalogVariantParams): Promise<CatalogVariant> {
    let variant = await this.catalogRepository.getVariantByProductId(
      params.productId,
      params.type as ServiceType
    );

    for (const enricher of this.enrichers) {
      const [enriched] = await enricher.enrich([variant]);
      variant = enriched;
    }

    return variant;
  }
}
