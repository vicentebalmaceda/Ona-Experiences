import { getCache, withCache } from '../../cache/cache';
import { cacheKeys, CACHE_TTL_SECONDS } from '../../cache/keys';
import type { Env } from '../../config/env';
import type { BsaleListResponse, BsalePriceListDetail, BsaleProductTax } from '../../types/bsale';
import { DomainError } from '../../types/errors';
import type { VariantPricing } from '../../types/sales';
import { createLogger } from '../../utils/logger';
import type { BsaleClient } from './client';

const log = createLogger('bsale-pricing');

function formatTaxId(taxIds: number[]): string {
  if (taxIds.length === 0) return '[1]';
  return `[${taxIds.join(',')}]`;
}

export class BsaleVariantPricing {
  constructor(
    private readonly client: BsaleClient,
    private readonly env: Env
  ) {}

  async resolve(variantId: number, productId: number): Promise<VariantPricing> {
    return withCache(getCache(), cacheKeys.pricing(variantId), CACHE_TTL_SECONDS.pricing, () =>
      this.fetchPricing(variantId, productId)
    );
  }

  private async fetchPricing(variantId: number, productId: number): Promise<VariantPricing> {
    log.debug('Resolving variant pricing', {
      variantId,
      productId,
      priceListId: this.env.BSALE_PRICE_LIST_ID
    });

    const detail = await this.findPriceListDetail(variantId);
    if (!detail) {
      throw new DomainError(
        `No price found for variant ${variantId} in price list ${this.env.BSALE_PRICE_LIST_ID}`,
        404,
        'PRICE_NOT_FOUND'
      );
    }

    let taxId = detail.taxId;
    if (!taxId) {
      const taxIds = await this.resolveTaxIds(productId, detail);
      taxId = formatTaxId(taxIds);
    }

    log.debug('Variant pricing resolved', { variantId, netUnitValue: detail.variantValue, taxId });

    return {
      variantId,
      netUnitValue: detail.variantValue,
      taxId
    };
  }

  private async findPriceListDetail(variantId: number): Promise<BsalePriceListDetail | null> {
    const page = await this.client.get<BsaleListResponse<BsalePriceListDetail>>(
      `/price_lists/${this.env.BSALE_PRICE_LIST_ID}/details.json`,
      { variantid: variantId, limit: 1, expand: 'variant' }
    );

    return page.items[0] ?? null;
  }

  private async resolveTaxIds(productId: number, detail: BsalePriceListDetail): Promise<number[]> {
    if (detail.taxes?.length) {
      const ids = detail.taxes.map((tax) => tax.id).filter((id): id is number => id != null);
      if (ids.length > 0) return ids;
    }

    const productTaxes = await this.client.get<BsaleListResponse<BsaleProductTax>>(
      `/products/${productId}/product_taxes.json`,
      { limit: 50 }
    );

    const ids = productTaxes.items
      .map((item) => item.tax?.id ?? item.id)
      .filter((id): id is number => id != null);

    if (ids.length === 0) {
      log.warn('No product taxes found; defaulting taxId to [1]', { productId });
      return [1];
    }

    return ids;
  }
}
