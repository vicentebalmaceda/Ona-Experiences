import type { CatalogType, CatalogVariant } from './catalog';

export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  rut?: string;
  phone?: string;
  address?: string;
  city?: string;
  municipality?: string;
  activity?: string;
  companyOrPerson?: 0 | 1;
  isForeigner?: 0 | 1;
}

export interface QuoteSale {
  salesId: string;
  serviceType: CatalogType;
  productId: number;
  variantId: number;
  productName: string;
  bsaleClientId: number;
  bsaleDocumentId: number;
  documentNumber: number;
  totalAmount: number;
  netAmount: number;
  taxAmount: number;
  urlPdf: string | null;
  urlPublicView: string | null;
}

export interface VariantPricing {
  variantId: number;
  netUnitValue: number;
  taxId: string;
}

export interface CreateQuoteParams {
  serviceType: CatalogType;
  variant: CatalogVariant;
  pricing: VariantPricing;
  clientId: number;
  customer: Customer;
  quantity: number;
  reservationDate: string;
  reservationEndDate: string;
  notes: string;
  emissionDate: number;
  expirationDate: number;
  salesId: string;
}
