import type { ServicePresentation } from '../../domain/entities/ServicePresentation.js';
import { EMPTY_SERVICE_PRESENTATION } from '../../domain/entities/ServicePresentation.js';

export interface CatalogSeedRecord {
  productId?: number;
  zone?: string | null;
  phone?: string | null;
  email?: string | null;
  representative?: string | null;
  lat?: number | null;
  lng?: number | null;
  image?: string | null;
  gallery?: string[] | null;
  rating?: number | null;
  reviews?: number | null;
  ratingLabel?: string | null;
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined;
}

export function mergeSeedPresentation(
  current: ServicePresentation | undefined,
  seed: CatalogSeedRecord,
  includeRepresentative: boolean
): ServicePresentation {
  const base = current ?? EMPTY_SERVICE_PRESENTATION;
  const merged: ServicePresentation = { ...base };

  const fields: Array<keyof ServicePresentation> = [
    'zone',
    'phone',
    'email',
    'lat',
    'lng',
    'image',
    'gallery',
    'rating',
    'reviews',
    'ratingLabel'
  ];

  if (includeRepresentative) {
    fields.push('representative');
  }

  for (const field of fields) {
    const seedValue = seed[field];
    if (seedValue === undefined) continue;
    if (isMissing(merged[field])) {
      merged[field] = seedValue as never;
    }
  }

  return merged;
}
