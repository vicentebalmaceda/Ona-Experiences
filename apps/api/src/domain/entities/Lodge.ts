export interface Lodge {
  productId: number;
  name: string | null;
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
