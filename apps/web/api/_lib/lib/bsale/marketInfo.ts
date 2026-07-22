import { getCache, withCache } from '../../cache/cache.js';
import { cacheKeys, CACHE_TTL_SECONDS } from '../../cache/keys.js';
import type {
  BsaleMarketInfo,
  BsaleMarketListResponse,
  BsaleMarketPicture
} from '../../types/bsale.js';
import { createLogger } from '../../utils/logger.js';
import type { BsaleClient } from './client.js';

const log = createLogger('bsale-market-info');

function isPictureArray(
  pictures: BsaleMarketInfo['pictures']
): pictures is BsaleMarketPicture[] {
  return Array.isArray(pictures);
}

export function extractPictureHrefs(info: BsaleMarketInfo): string[] {
  if (!isPictureArray(info.pictures)) return [];

  return info.pictures
    .map((picture) => picture.href?.trim())
    .filter((href): href is string => Boolean(href));
}

/**
 * Fetches BSale descripción web (market_info) by variant SKU (`code`).
 * Soft-fails per SKU — catalog must keep working without production ecommerce data.
 *
 * Do not use `prodArray` with ERP product ids; that filter expects web description ids.
 */
export class BsaleMarketInfoRepository {
  constructor(private readonly client: BsaleClient) {}

  async getByCodes(codes: string[]): Promise<Map<string, BsaleMarketInfo>> {
    const uniqueCodes = [
      ...new Set(codes.map((code) => code.trim()).filter((code) => code.length > 0))
    ];
    if (uniqueCodes.length === 0) return new Map();

    const entries = await Promise.all(
      uniqueCodes.map(async (code) => {
        const info = await this.getByCode(code);
        return info ? ([code, info] as const) : null;
      })
    );

    const result = new Map<string, BsaleMarketInfo>();
    for (const entry of entries) {
      if (entry) result.set(entry[0], entry[1]);
    }

    log.info('Market info loaded by SKU', {
      requested: uniqueCodes.length,
      found: result.size
    });

    return result;
  }

  private async getByCode(code: string): Promise<BsaleMarketInfo | null> {
    try {
      const cached = await withCache(
        getCache(),
        cacheKeys.marketInfoByCode(code),
        CACHE_TTL_SECONDS.marketInfo,
        async () => {
          const info = await this.fetchByCode(code);
          // Wrap so a miss (null) is still cached; bare null looks like a cache miss.
          return { info } as { info: BsaleMarketInfo | null };
        }
      );
      return cached.info;
    } catch (error) {
      log.warn('Market info fetch failed for SKU; continuing without web description', {
        code,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async fetchByCode(code: string): Promise<BsaleMarketInfo | null> {
    const response = await this.client.get<BsaleMarketListResponse<BsaleMarketInfo>>(
      '/v2/products/list/market_info.json',
      {
        code,
        expand: '[images]',
        limit: 1,
        offset: 0
      }
    );

    const items = Array.isArray(response.data) ? response.data : [];
    const first = items[0];
    if (!first) {
      log.debug('No market_info for SKU', { code });
      return null;
    }

    return this.ensurePictures(first);
  }

  /**
   * When expand=[images] still returns a pictures href stub, follow it once.
   */
  private async ensurePictures(item: BsaleMarketInfo): Promise<BsaleMarketInfo> {
    if (isPictureArray(item.pictures) && item.pictures.length > 0) {
      return item;
    }

    const picturesHref =
      item.pictures && !Array.isArray(item.pictures) ? item.pictures.href : undefined;
    if (!picturesHref && item.id == null) {
      return item;
    }

    try {
      const path =
        picturesHref && (picturesHref.startsWith('http') || picturesHref.startsWith('/'))
          ? picturesHref
          : `/v2/products/market_info/${item.id}/pictures.json`;

      const response = await this.client.get<BsaleMarketListResponse<BsaleMarketPicture>>(path);
      const pictures = Array.isArray(response.data) ? response.data : [];
      return { ...item, pictures };
    } catch (error) {
      log.debug('Could not load market_info pictures', {
        webProductId: item.id,
        productId: item.productId,
        error: error instanceof Error ? error.message : String(error)
      });
      return item;
    }
  }
}
