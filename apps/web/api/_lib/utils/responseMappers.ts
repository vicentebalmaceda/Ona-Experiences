import type { CatalogVariant, Guide, ListVariantsResult, Lodge } from '../types/catalog.js';
import { EMPTY_SERVICE_PRESENTATION } from '../types/catalog.js';
import type { QuoteSale } from '../types/sales.js';

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
    ratingLabel: presentation.ratingLabel
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
    ratingLabel: presentation.ratingLabel
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
