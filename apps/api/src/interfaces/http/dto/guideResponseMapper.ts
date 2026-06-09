import type { CatalogVariant } from '../../../domain/entities/CatalogVariant.js';
import type { Guide } from '../../../domain/entities/Guide.js';
import { mapVariantPresentation } from './presentationResponseMapper.js';

export function mapCatalogVariantToGuide(variant: CatalogVariant): Guide {
  const presentation = mapVariantPresentation(variant);

  return {
    productId: variant.productId,
    name: variant.productName,
    zone: presentation.zone,
    phone: presentation.phone,
    email: presentation.email,
    lat: presentation.lat,
    lng: presentation.lng,
    image: presentation.image,
    gallery: presentation.gallery,
    rating: presentation.rating,
    reviews: presentation.reviews,
    ratingLabel: presentation.ratingLabel
  };
}

export function toGuideResponse(variant: CatalogVariant): Guide {
  return mapCatalogVariantToGuide(variant);
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
