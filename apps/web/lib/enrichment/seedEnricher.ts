import type { CatalogVariant } from '../../types/catalog';
import catalogSeed from './catalog-seed.json';
import { mergeSeedPresentation, type CatalogSeedRecord } from './mergeSeedPresentation';

export interface ServiceEnricher {
  enrich(variants: CatalogVariant[]): Promise<CatalogVariant[]>;
}

interface CatalogSeedFile {
  lodges: CatalogSeedRecord[];
  guides: CatalogSeedRecord[];
}

export class SeedServiceEnricher implements ServiceEnricher {
  private readonly lodgeSeedByProductId: Map<number, CatalogSeedRecord>;
  private readonly guideSeedByProductId: Map<number, CatalogSeedRecord>;

  constructor(seed: CatalogSeedFile = catalogSeed as CatalogSeedFile) {
    this.lodgeSeedByProductId = new Map(
      seed.lodges
        .filter((item) => item.productId != null)
        .map((item) => [item.productId as number, item])
    );
    this.guideSeedByProductId = new Map(
      seed.guides
        .filter((item) => item.productId != null)
        .map((item) => [item.productId as number, item])
    );
  }

  async enrich(variants: CatalogVariant[]): Promise<CatalogVariant[]> {
    return variants.map((variant) => this.enrichVariant(variant));
  }

  private enrichVariant(variant: CatalogVariant): CatalogVariant {
    const seed =
      variant.serviceType === 'lodge'
        ? this.lodgeSeedByProductId.get(variant.productId)
        : variant.serviceType === 'guide'
          ? this.guideSeedByProductId.get(variant.productId)
          : undefined;

    if (!seed) return variant;

    return {
      ...variant,
      presentation: mergeSeedPresentation(
        variant.presentation,
        seed,
        variant.serviceType === 'lodge'
      )
    };
  }
}
