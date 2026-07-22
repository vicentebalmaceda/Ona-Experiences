export type ServiceType = 'lodge' | 'guide' | 'unknown';

export type CatalogType = 'lodge' | 'guide';

export interface ServicePresentation {
  zone: string | null;
  phone: string | null;
  email: string | null;
  representative: string | null;
  lat: number | null;
  lng: number | null;
  image: string | null;
  gallery: string[] | null;
  rating: number | null;
  reviews: number | null;
  ratingLabel: string | null;
  /** HTML (or plain) copy from BSale market_info descripción web. */
  description: string | null;
}

export const EMPTY_SERVICE_PRESENTATION: ServicePresentation = {
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
  ratingLabel: null,
  description: null
};

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
  type: CatalogType;
}

export interface ListVariantsResult {
  items: CatalogVariant[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface Lodge {
  productId: number;
  name: string | null;
  description: string | null;
  zone: string | null;
  phone: string | null;
  email: string | null;
  representative: string | null;
  lat: number | null;
  lng: number | null;
  image: string | null;
  gallery: string[] | null;
  rating: number | null;
  reviews: number | null;
  ratingLabel: string | null;
}

export interface Guide {
  productId: number;
  name: string | null;
  description: string | null;
  zone: string | null;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
  image: string | null;
  gallery: string[] | null;
  rating: number | null;
  reviews: number | null;
  ratingLabel: string | null;
}
