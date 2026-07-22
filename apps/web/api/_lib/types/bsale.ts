export interface BsaleListResponse<T> {
  items: T[];
  count: number;
  limit: number;
  offset: number;
}

/** market_info / descripción web list envelope (v2/v3). */
export interface BsaleMarketListResponse<T> {
  code?: string | number;
  href?: string;
  count: number;
  limit: number;
  offset: number;
  data: T[];
  next?: string;
}

export interface BsaleMarketPicture {
  id?: number;
  href: string;
  state?: number | boolean;
  legendImage?: string;
}

export interface BsaleMarketInfo {
  id: number;
  productId: number;
  idVariantDefault?: number;
  urlSlug?: string;
  name?: string;
  description?: string | null;
  displayNotice?: string | null;
  state?: number;
  urlImg?: string | null;
  pictures?: BsaleMarketPicture[] | { href?: string } | null;
  link?: string;
}

export interface BsaleProductType {
  id: number;
  name: string;
  state: number;
}

export interface BsaleProductRelation {
  href?: string;
  id?: number | string;
}

export interface BsaleProduct {
  id: number;
  name: string;
  description: string | null;
  classification: number;
  state: number;
  product_type?: BsaleProductRelation;
  productType?: BsaleProductRelation;
}

export interface BsaleVariant {
  id: number;
  code: string;
  description: string;
  state: number;
}

export interface BsaleClient {
  id: number;
  firstName: string;
  lastName: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  municipality?: string;
  activity?: string;
  companyOrPerson?: number;
  isForeigner?: number;
  state?: number;
}

export interface BsaleDocument {
  id: number;
  number: number;
  totalAmount: number;
  netAmount: number;
  taxAmount: number;
  urlPdf?: string;
  urlPublicView?: string;
  salesId?: string;
}

export interface BsalePriceListDetail {
  id: number;
  variantValue: number;
  variant?: { id: number };
  variantId?: number;
  taxId?: string;
  taxes?: Array<{ id?: number; code?: number; percentage?: number }>;
}

export interface BsaleProductTax {
  id: number;
  tax?: { id?: number; code?: number; percentage?: number };
}
