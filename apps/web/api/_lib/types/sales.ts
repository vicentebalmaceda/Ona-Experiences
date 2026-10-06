import type { CatalogType, CatalogVariant } from './catalog.js';

/**
 * Identity document a visitor identifies with on a quote request.
 * `rut` → Chilean RUT stored in BSale `code`; `passport` → foreign guest
 * (`isForeigner: 1`, BSale assigns the generic RUT 55555555-5 unless a
 * passport number is sent as `code`).
 */
export type CustomerDocumentType = 'rut' | 'passport';

export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  documentType?: CustomerDocumentType;
  /** Normalized RUT (`12345678-9`), required when documentType is `rut`. */
  rut?: string;
  /** Passport or foreign id number, optional when documentType is `passport`. */
  passport?: string;
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
