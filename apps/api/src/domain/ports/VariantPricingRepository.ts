import type { VariantPricing } from '../entities/QuoteSale.js';

export interface VariantPricingRepository {
  resolve(variantId: number, productId: number): Promise<VariantPricing>;
}
