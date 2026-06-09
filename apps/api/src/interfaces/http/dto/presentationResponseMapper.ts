import type { CatalogVariant } from '../../../domain/entities/CatalogVariant.js';
import { EMPTY_SERVICE_PRESENTATION } from '../../../domain/entities/ServicePresentation.js';

export function mapVariantPresentation(variant: CatalogVariant) {
  return variant.presentation ?? EMPTY_SERVICE_PRESENTATION;
}
