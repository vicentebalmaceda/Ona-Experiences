import type { ServicePresentation } from './ServicePresentation.js';

export type ServiceType = 'lodge' | 'guide' | 'unknown';

export interface CatalogVariant {
  id: number;
  code: string;
  description: string;
  serviceType: ServiceType;
  productId: number;
  productName: string;
  state: number;
  presentation?: ServicePresentation;
}

export interface ListVariantsParams {
  limit: number;
  offset: number;
  type: 'lodge' | 'guide';
}

export interface ListVariantsResult {
  items: CatalogVariant[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}
