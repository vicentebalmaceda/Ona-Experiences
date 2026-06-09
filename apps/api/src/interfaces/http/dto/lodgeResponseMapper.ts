import type { CatalogVariant } from '../../../domain/entities/CatalogVariant.js';
import type { Lodge } from '../../../domain/entities/Lodge.js';
import { mapVariantPresentation } from './presentationResponseMapper.js';

export function mapCatalogVariantToLodge(variant: CatalogVariant): Lodge {
  const presentation = mapVariantPresentation(variant);

  return {
    productId: variant.productId,
    name: variant.productName,
    zone: presentation.zone,
    phone: presentation.phone,
    email: presentation.email,
    representative: presentation.representative,
    lat: presentation.lat,
    lng: presentation.lng,
    image: presentation.image,
    gallery: presentation.gallery,
    rating: presentation.rating,
    reviews: presentation.reviews,
    ratingLabel: presentation.ratingLabel
  };
}

export function toLodgeResponse(variant: CatalogVariant): Lodge {
  return mapCatalogVariantToLodge(variant);
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
