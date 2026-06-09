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
  ratingLabel: null
};
