import type { ListVariantsResult } from '../../../domain/entities/CatalogVariant.js';

export function toCatalogResponse(result: ListVariantsResult) {
  return {
    items: result.items,
    pagination: result.pagination
  };
}
