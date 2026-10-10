import type { IncomingMessage } from 'node:http';
import type { HandleUploadBody } from '@vercel/blob/client';
import type { Cache } from '../cache/cache.js';
import { CACHE_TTL_SECONDS, cacheKeys } from '../cache/keys.js';
import type { BlobStorage, ClientTokenRules } from '../lib/blob/blobStorage.js';
import {
  blobPrefixForSlot,
  checkFileForSlot,
  isSiteAssetSlot,
  kindForContentType,
  SITE_ASSET_SLOTS,
  SLOT_RULES,
  type SiteAssetKind,
  type SiteAssetSlot
} from '../../../shared/siteAssetSlots.js';
import type { SiteAssetRecord, SiteAssetStore } from '../lib/siteAssets/siteAssetStore.js';
import { DomainError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('site-assets');

/** What the public site needs to render a slot. */
export interface PublishedSiteAsset {
  kind: SiteAssetKind;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export type PublishedSiteAssets = Record<SiteAssetSlot, PublishedSiteAsset | null>;

/** Admin view of a slot. */
export interface SiteAssetView {
  slot: SiteAssetSlot;
  kind: SiteAssetKind;
  url: string;
  pathname: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  publishedBy: string;
  publishedAt: string;
}

export interface PublishSiteAssetInput {
  slot: SiteAssetSlot;
  pathname: string;
  alt?: string;
  width?: number;
  height?: number;
  publishedBy: string;
}

export interface SiteAssetServiceDeps {
  store: SiteAssetStore;
  blob: BlobStorage;
  cache: Cache;
}

export class SiteAssetService {
  constructor(private readonly deps: SiteAssetServiceDeps) {}

  get blobConfigured(): boolean {
    return this.deps.blob.configured;
  }

  /** Public read path: cached, never throws on an empty table. */
  async getPublished(): Promise<PublishedSiteAssets> {
    const key = cacheKeys.siteAssets();
    const cached = await this.deps.cache.get<PublishedSiteAssets>(key);
    if (cached) return cached;

    const published = emptyPublished();
    let records: SiteAssetRecord[];
    try {
      records = await this.deps.store.listAll();
    } catch (error) {
      // Typically the table is not migrated yet. The site must still render,
      // so answer with defaults and do not cache the failure.
      log.warn('Could not load site assets; serving defaults', {
        message: error instanceof Error ? error.message : String(error)
      });
      return published;
    }
    for (const record of records) {
      published[record.slot] = {
        kind: record.kind,
        url: record.url,
        alt: record.alt,
        width: record.width,
        height: record.height
      };
    }
    await this.deps.cache.set(key, published, CACHE_TTL_SECONDS.siteAssets);
    return published;
  }

  async listForAdmin(): Promise<Record<SiteAssetSlot, SiteAssetView | null>> {
    const items = Object.fromEntries(SITE_ASSET_SLOTS.map((slot) => [slot, null])) as Record<
      SiteAssetSlot,
      SiteAssetView | null
    >;
    for (const record of await this.deps.store.listAll()) {
      items[record.slot] = toView(record);
    }
    return items;
  }

  /**
   * Token exchange for a browser upload. The browser proposes a pathname and a
   * `{ slot }` payload; we only mint a token when the pathname sits under the
   * slot's prefix and the slot's type/size rules are attached to the token.
   */
  async handleClientUpload(request: IncomingMessage, body: HandleUploadBody): Promise<unknown> {
    return this.deps.blob.handleClientUpload(request, body, async (pathname, clientPayload) => {
      const slot = parseSlotPayload(clientPayload);
      if (!pathname.startsWith(blobPrefixForSlot(slot))) {
        throw new DomainError(
          `Upload pathname must start with ${blobPrefixForSlot(slot)}`,
          400,
          'INVALID_UPLOAD_PATH'
        );
      }
      const rules = SLOT_RULES[slot];
      const tokenRules: ClientTokenRules = {
        allowedContentTypes: rules.allowedContentTypes,
        maximumSizeInBytes: rules.maxSizeBytes,
        tokenPayload: JSON.stringify({ slot })
      };
      log.info('Minting site asset upload token', { slot, pathname });
      return tokenRules;
    });
  }

  /** Confirm step: verifies the blob really is ours and matches the slot, then publishes it. */
  async publish(input: PublishSiteAssetInput): Promise<SiteAssetView> {
    const { slot, pathname } = input;
    if (!pathname.startsWith(blobPrefixForSlot(slot))) {
      throw new DomainError('Blob pathname does not belong to this slot', 400, 'INVALID_UPLOAD_PATH');
    }

    const meta = await this.deps.blob.head(pathname);
    if (!meta) {
      throw new DomainError('Uploaded file not found in storage', 404, 'BLOB_NOT_FOUND');
    }

    const check = checkFileForSlot(slot, meta.contentType, meta.sizeBytes);
    if (!check.ok) {
      // Never leave a rejected file lying around in the store.
      await this.deps.blob.delete(pathname);
      throw new DomainError(check.reason ?? 'File not allowed for this slot', 422, 'ASSET_REJECTED');
    }

    const kind = kindForContentType(meta.contentType);
    if (!kind) {
      await this.deps.blob.delete(pathname);
      throw new DomainError('Unsupported content type', 422, 'ASSET_REJECTED');
    }

    const previous = await this.deps.store.getBySlot(slot);
    const record = await this.deps.store.upsert({
      slot,
      kind,
      url: meta.url,
      pathname: meta.pathname,
      contentType: meta.contentType,
      sizeBytes: meta.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      alt: input.alt ?? null,
      publishedBy: input.publishedBy
    });
    await this.deps.cache.delete(cacheKeys.siteAssets());

    if (previous && previous.pathname !== record.pathname) {
      await this.deleteQuietly(previous.pathname);
    }

    log.info('Site asset published', { slot, pathname: record.pathname, by: input.publishedBy });
    return toView(record);
  }

  /** Restore the bundled default: drops the row and the blob. */
  async restoreDefault(slot: SiteAssetSlot): Promise<void> {
    const removed = await this.deps.store.remove(slot);
    await this.deps.cache.delete(cacheKeys.siteAssets());
    if (removed) {
      await this.deleteQuietly(removed.pathname);
      log.info('Site asset restored to default', { slot });
    }
  }

  private async deleteQuietly(pathname: string): Promise<void> {
    try {
      await this.deps.blob.delete(pathname);
    } catch (error) {
      // The row is already gone; an orphan blob is a cleanup task, not a failure.
      log.warn('Could not delete previous blob', {
        pathname,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export function emptyPublished(): PublishedSiteAssets {
  return Object.fromEntries(SITE_ASSET_SLOTS.map((slot) => [slot, null])) as PublishedSiteAssets;
}

function parseSlotPayload(clientPayload: string | null): SiteAssetSlot {
  let slot: unknown;
  try {
    slot = clientPayload ? (JSON.parse(clientPayload) as { slot?: unknown }).slot : undefined;
  } catch {
    slot = undefined;
  }
  if (!isSiteAssetSlot(slot)) {
    throw new DomainError('Unknown asset slot', 400, 'INVALID_SLOT');
  }
  return slot;
}

function toView(record: SiteAssetRecord): SiteAssetView {
  return {
    slot: record.slot,
    kind: record.kind,
    url: record.url,
    pathname: record.pathname,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    width: record.width,
    height: record.height,
    alt: record.alt,
    publishedBy: record.publishedBy,
    publishedAt: record.publishedAt.toISOString()
  };
}
