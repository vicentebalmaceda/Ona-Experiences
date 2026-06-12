import type { CatalogVariant } from '../entities/CatalogVariant.js';
import type { Customer } from '../entities/Customer.js';
import type { QuoteSale, VariantPricing } from '../entities/QuoteSale.js';

export interface CreateQuoteParams {
  serviceType: 'lodge' | 'guide';
  variant: CatalogVariant;
  pricing: VariantPricing;
  clientId: number;
  customer: Customer;
  quantity: number;
  reservationDate: string;
  notes: string;
  emissionDate: number;
  expirationDate: number;
  salesId: string;
}

export interface SalesRepository {
  createQuote(params: CreateQuoteParams): Promise<QuoteSale>;
}
