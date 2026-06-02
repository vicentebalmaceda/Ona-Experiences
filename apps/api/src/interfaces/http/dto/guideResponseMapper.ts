import type { CatalogVariant } from '../../../domain/entities/CatalogVariant.js';
import type { Guide } from '../../../domain/entities/Guide.js';

export function mapCatalogVariantToGuide(variant: CatalogVariant): Guide {
  return {
    productId: variant.productId,
    name: variant.productName,
    zone: null,
    phone: null,
    email: null,
    lat: null,
    lng: null,
    image: null,
    gallery: null,
    rating: null,
    reviews: null,
    ratingLabel: null
  };
}

export function toGuideListResponse(result: {
  items: CatalogVariant[];
  pagination: { limit: number; offset: number; count: number };
}) {
  return {
    items: result.items.map(mapCatalogVariantToGuide),
    pagination: result.pagination
  };
}
