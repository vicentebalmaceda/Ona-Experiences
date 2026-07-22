import { getCache, withCache } from '../../cache/cache.js';
import { cacheKeys, CACHE_TTL_SECONDS } from '../../cache/keys.js';
import type {
  BsaleMarketDescription,
  BsaleMarketInfo,
  BsaleMarketListResponse,
  BsaleMarketPicture
} from '../../types/bsale.js';
import { createLogger } from '../../utils/logger.js';
import type { BsaleClient } from './client.js';

const log = createLogger('bsale-market-info');

export type DescriptionsPresentation = {
  zone?: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
};

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

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripHtml(html: string): string {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMailto(html: string): string | null {
  const match = html.match(/mailto:([^"'>\s]+)/i);
  if (!match?.[1]) return null;
  return decodeBasicEntities(match[1].trim());
}

function parseCoordinate(raw: string): number | undefined {
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Maps expand=[descriptions] blocks (Lat, Lng, Zone, Phone, Email) into presentation fields.
 * Missing or empty entries are omitted so callers can leave those fields null.
 */
export function extractPresentationFromDescriptions(
  info: BsaleMarketInfo
): DescriptionsPresentation {
  const descriptions = Array.isArray(info.descriptions) ? info.descriptions : [];
  if (descriptions.length === 0) return {};

  const byName = new Map<string, BsaleMarketDescription>();
  for (const entry of descriptions) {
    const name = entry.descriptionName?.trim().toLowerCase();
    if (!name) continue;
    byName.set(name, entry);
  }

  const result: DescriptionsPresentation = {};

  const latHtml = byName.get('lat')?.html;
  if (typeof latHtml === 'string') {
    const lat = parseCoordinate(stripHtml(latHtml));
    if (lat !== undefined) result.lat = lat;
  }

  const lngHtml = byName.get('lng')?.html;
  if (typeof lngHtml === 'string') {
    const lng = parseCoordinate(stripHtml(lngHtml));
    if (lng !== undefined) result.lng = lng;
  }

  const zoneHtml = byName.get('zone')?.html;
  if (typeof zoneHtml === 'string') {
    const zone = stripHtml(zoneHtml);
    if (zone) result.zone = zone;
  }

  const phoneHtml = byName.get('phone')?.html;
  if (typeof phoneHtml === 'string') {
    const phone = stripHtml(phoneHtml);
    if (phone) result.phone = phone;
  }

  const emailHtml = byName.get('email')?.html;
  if (typeof emailHtml === 'string') {
    const email = extractMailto(emailHtml) ?? stripHtml(emailHtml);
    if (email) result.email = email;
  }

  return result;
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
        expand: '[images,descriptions]',
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
