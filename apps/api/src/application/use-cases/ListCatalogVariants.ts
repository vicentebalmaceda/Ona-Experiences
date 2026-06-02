import type { ListVariantsParams, ListVariantsResult } from '../../domain/entities/CatalogVariant.js';
import type { CatalogRepository } from '../../domain/ports/CatalogRepository.js';
import type { ServiceEnricher } from '../../domain/ports/ServiceEnricher.js';

export class ListCatalogVariants {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly enrichers: ServiceEnricher[]
  ) {}

  async execute(params: ListVariantsParams): Promise<ListVariantsResult> {
    const result = await this.catalogRepository.listVariants(params);

    let items = result.items;
    for (const enricher of this.enrichers) {
      items = await enricher.enrich(items);
    }

    return { ...result, items };
  }
}
