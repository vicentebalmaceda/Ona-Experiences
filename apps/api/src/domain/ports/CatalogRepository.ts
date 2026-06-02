import type { ListVariantsParams, ListVariantsResult } from '../entities/CatalogVariant.js';

export interface CatalogRepository {
  listVariants(params: ListVariantsParams): Promise<ListVariantsResult>;
}
