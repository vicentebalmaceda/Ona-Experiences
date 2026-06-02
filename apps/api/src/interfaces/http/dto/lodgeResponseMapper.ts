import type { CatalogVariant } from '../../../domain/entities/CatalogVariant.js';
import type { Lodge } from '../../../domain/entities/Lodge.js';

export function mapCatalogVariantToLodge(variant: CatalogVariant): Lodge {
  return {
    productId: variant.productId,
    name: variant.productName,
    zone: null,
    phone: null,
    email: null,
    representative: null,
    lat: null,
    lng: null,
    image: null,
    gallery: null,
    rating: null,
    reviews: null,
    ratingLabel: null
  };
}

export function toLodgeListResponse(result: {
  items: CatalogVariant[];
  pagination: { limit: number; offset: number; count: number };
}) {
  return {
    items: result.items.map(mapCatalogVariantToLodge),
    pagination: result.pagination
  };
}
