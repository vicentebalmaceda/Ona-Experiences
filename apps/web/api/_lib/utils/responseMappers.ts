import type { CatalogType, CatalogVariant, Guide, ListVariantsResult, Lodge } from '../types/catalog.js';
import { EMPTY_SERVICE_PRESENTATION } from '../types/catalog.js';
import type { ReviewAggregate } from '../types/reviews.js';
import type { QuoteSale } from '../types/sales.js';
import { ReviewService, aggregateLookup } from '../services/reviewService.js';

function mapVariantPresentation(variant: CatalogVariant) {
  return variant.presentation ?? EMPTY_SERVICE_PRESENTATION;
}

export function mapCatalogVariantToLodge(variant: CatalogVariant): Lodge {
  const presentation = mapVariantPresentation(variant);

  return {
    productId: variant.productId,
    name: variant.productName,
    description: presentation.description,
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
    ratingLabel: presentation.ratingLabel,
    referencePrice: presentation.referencePrice
  };
}

export function mapCatalogVariantToGuide(variant: CatalogVariant): Guide {
  const presentation = mapVariantPresentation(variant);

  return {
    productId: variant.productId,
    name: variant.productName,
    description: presentation.description,
    zone: presentation.zone,
    phone: presentation.phone,
    email: presentation.email,
    lat: presentation.lat,
    lng: presentation.lng,
    image: presentation.image,
    gallery: presentation.gallery,
    rating: presentation.rating,
    reviews: presentation.reviews,
    ratingLabel: presentation.ratingLabel,
    referencePrice: presentation.referencePrice
  };
}

export function toLodgeListResponse(result: ListVariantsResult) {
  return {
    items: result.items.map(mapCatalogVariantToLodge),
    pagination: result.pagination
  };
}

export function toGuideListResponse(result: ListVariantsResult) {
  return {
    items: result.items.map(mapCatalogVariantToGuide),
    pagination: result.pagination
  };
}

export function applyVisibleReviewAggregate<T extends { productId: number; rating: number | null; reviews: number | null; ratingLabel: string | null }>(
  item: T,
  aggregate: ReviewAggregate
): T {
  if (aggregate.count === 0 || aggregate.average == null) {
    return { ...item, rating: null, reviews: 0, ratingLabel: null };
  }
  return {
    ...item,
    rating: aggregate.average,
    reviews: aggregate.count,
    ratingLabel: null
  };
}

export async function attachLodgeReviewAggregates(
  items: Lodge[],
  reviewService: ReviewService
): Promise<Lodge[]> {
  return attachAggregates(items, 'lodge', reviewService);
}

export async function attachGuideReviewAggregates(
  items: Guide[],
  reviewService: ReviewService
): Promise<Guide[]> {
  return attachAggregates(items, 'guide', reviewService);
}

async function attachAggregates<T extends { productId: number; rating: number | null; reviews: number | null; ratingLabel: string | null }>(
  items: T[],
  catalogType: CatalogType,
  reviewService: ReviewService
): Promise<T[]> {
  const aggregates = await reviewService.getAggregatesFor(
    items.map((item) => ({ catalogType, bsaleProductId: item.productId }))
  );
  return items.map((item) =>
    applyVisibleReviewAggregate(item, aggregateLookup(aggregates, catalogType, item.productId))
  );
}

export function toSaleResponse(quote: QuoteSale) {
  return {
    salesId: quote.salesId,
    serviceType: quote.serviceType,
    productId: quote.productId,
    variantId: quote.variantId,
    productName: quote.productName,
    bsaleClientId: quote.bsaleClientId,
    bsaleDocumentId: quote.bsaleDocumentId,
    documentNumber: quote.documentNumber,
    totalAmount: quote.totalAmount,
    netAmount: quote.netAmount,
    taxAmount: quote.taxAmount,
    urlPdf: quote.urlPdf,
    urlPublicView: quote.urlPublicView
  };
}
