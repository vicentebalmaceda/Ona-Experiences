import {
  BsaleMarketInfoRepository,
  extractPictureHrefs,
  extractPresentationFromDescriptions
} from '../bsale/marketInfo.js';
import type { CatalogVariant, ServicePresentation } from '../../types/catalog.js';
import { EMPTY_SERVICE_PRESENTATION } from '../../types/catalog.js';
import { createLogger } from '../../utils/logger.js';
import type { ServiceEnricher } from './seedEnricher.js';

const log = createLogger('market-info-enricher');

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Applies BSale descripción web fields onto catalog variants.
 * Prefer market_info over seed; gallery is only set when pictures is non-empty.
 * Loads market_info by variant SKU (`code`).
 */
export class MarketInfoEnricher implements ServiceEnricher {
  constructor(private readonly marketInfoRepository: BsaleMarketInfoRepository) {}

  async enrich(variants: CatalogVariant[]): Promise<CatalogVariant[]> {
    if (variants.length === 0) return variants;

    const codes = variants.map((variant) => variant.code).filter((code) => nonEmpty(code));
    if (codes.length === 0) {
      log.debug('Skipping market_info enrichment; no variant SKUs');
      return variants;
    }

    const byCode = await this.marketInfoRepository.getByCodes(codes);

    if (byCode.size === 0) {
      log.debug('No market_info rows for variant SKUs', { count: codes.length });
      return variants;
    }

    return variants.map((variant) => {
      if (!nonEmpty(variant.code)) return variant;

      const info = byCode.get(variant.code.trim());
      if (!info) return variant;

      const base: ServicePresentation = variant.presentation ?? EMPTY_SERVICE_PRESENTATION;
      const presentation: ServicePresentation = { ...base };

      if (nonEmpty(info.urlImg)) {
        presentation.image = info.urlImg.trim();
      }

      const gallery = extractPictureHrefs(info);
      if (gallery.length > 0) {
        presentation.gallery = gallery;
      }

      if (nonEmpty(info.description)) {
        presentation.description = info.description;
      }

      const fromDescriptions = extractPresentationFromDescriptions(info);
      if (fromDescriptions.zone !== undefined) presentation.zone = fromDescriptions.zone;
      if (fromDescriptions.phone !== undefined) presentation.phone = fromDescriptions.phone;
      if (fromDescriptions.email !== undefined) presentation.email = fromDescriptions.email;
      if (fromDescriptions.lat !== undefined) presentation.lat = fromDescriptions.lat;
      if (fromDescriptions.lng !== undefined) presentation.lng = fromDescriptions.lng;

      const productName = nonEmpty(info.name) ? info.name.trim() : variant.productName;

      return {
        ...variant,
        productName,
        presentation
      };
    });
  }
}
