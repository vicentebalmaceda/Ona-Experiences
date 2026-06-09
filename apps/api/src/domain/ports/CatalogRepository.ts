import type {
  CatalogVariant,
  ListVariantsParams,
  ListVariantsResult,
  ServiceType
} from '../entities/CatalogVariant.js';

export interface CatalogRepository {
  listVariants(params: ListVariantsParams): Promise<ListVariantsResult>;
  getVariantByProductId(productId: number, type: ServiceType): Promise<CatalogVariant>;
}
