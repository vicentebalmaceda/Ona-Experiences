import type { IncomingMessage } from 'node:http';
import type { HandleUploadBody } from '@vercel/blob/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cache } from '../cache/cache.js';
import type { BlobMetadata, BlobStorage, ClientTokenRules } from '../lib/blob/blobStorage.js';
import { MemorySiteAssetStore } from '../lib/siteAssets/memorySiteAssetStore.js';
import { SLOT_RULES } from '../../../shared/siteAssetSlots.js';
import { DomainError } from '../types/errors.js';
import { SiteAssetService } from './siteAssetService.js';

class FakeBlob implements BlobStorage {
  readonly configured = true;
  readonly blobs = new Map<string, BlobMetadata>();
  readonly deleted: string[] = [];

  seed(pathname: string, contentType: string, sizeBytes: number) {
    this.blobs.set(pathname, {
      pathname,
      url: `https://blob.test/${pathname}`,
      contentType,
      sizeBytes
    });
  }

  async head(pathname: string) {
    return this.blobs.get(pathname) ?? null;
  }

  async delete(pathname: string) {
    this.deleted.push(pathname);
    this.blobs.delete(pathname);
  }

  async handleClientUpload(
    _request: IncomingMessage,
    body: HandleUploadBody,
    decide: (pathname: string, clientPayload: string | null) => Promise<ClientTokenRules>
  ): Promise<unknown> {
    const proposed = body as unknown as { pathname: string; clientPayload: string | null };
    return decide(proposed.pathname, proposed.clientPayload);
  }
}

class FakeCache implements Cache {
  readonly store = new Map<string, unknown>();
  async get<T>(key: string) {
    return (this.store.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T) {
    this.store.set(key, value);
  }
  async delete(key: string) {
    this.store.delete(key);
  }
  async deleteByPrefix() {}
}

let store: MemorySiteAssetStore;
let blob: FakeBlob;
let cache: FakeCache;
let service: SiteAssetService;

beforeEach(() => {
  store = new MemorySiteAssetStore(() => new Date('2026-10-10T10:00:00.000Z'));
  blob = new FakeBlob();
  cache = new FakeCache();
  service = new SiteAssetService({ store, blob, cache });
});

describe('SiteAssetService.getPublished', () => {
  it('returns null for every slot when nothing is published, and caches it', async () => {
    const published = await service.getPublished();
    expect(published).toEqual({ hero: null, hero_poster: null, logo: null });
    expect(cache.store.size).toBe(1);
  });
});

describe('SiteAssetService.publish', () => {
  it('verifies the blob, stores the record and clears the cache', async () => {
    await service.getPublished();
    blob.seed('site/logo/20261010-logo.png', 'image/png', 20_000);

    const view = await service.publish({
      slot: 'logo',
      pathname: 'site/logo/20261010-logo.png',
      alt: 'ONA',
      width: 240,
      height: 240,
      publishedBy: 'admin@ona.example'
    });

    expect(view).toMatchObject({
      slot: 'logo',
      kind: 'image',
      url: 'https://blob.test/site/logo/20261010-logo.png',
      sizeBytes: 20_000,
      alt: 'ONA',
      publishedBy: 'admin@ona.example',
      publishedAt: '2026-10-10T10:00:00.000Z'
    });
    expect(cache.store.size).toBe(0);
    expect((await service.getPublished()).logo).toMatchObject({ kind: 'image', alt: 'ONA' });
  });

  it('deletes the previously published blob when replacing it', async () => {
    blob.seed('site/hero/old.jpg', 'image/jpeg', 1_000);
    blob.seed('site/hero/new.mp4', 'video/mp4', 5_000_000);
    await service.publish({ slot: 'hero', pathname: 'site/hero/old.jpg', publishedBy: 'a@b.c' });

    const view = await service.publish({ slot: 'hero', pathname: 'site/hero/new.mp4', publishedBy: 'a@b.c' });

    expect(view.kind).toBe('video');
    expect(blob.deleted).toEqual(['site/hero/old.jpg']);
  });

  it('rejects a pathname outside the slot prefix without touching storage', async () => {
    const head = vi.spyOn(blob, 'head');
    await expect(
      service.publish({ slot: 'logo', pathname: 'site/hero/x.png', publishedBy: 'a@b.c' })
    ).rejects.toMatchObject({ code: 'INVALID_UPLOAD_PATH' });
    expect(head).not.toHaveBeenCalled();
  });

  it('404s when the blob does not exist', async () => {
    await expect(
      service.publish({ slot: 'logo', pathname: 'site/logo/missing.png', publishedBy: 'a@b.c' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes and rejects a blob that breaks the slot rules', async () => {
    blob.seed('site/logo/huge.png', 'image/png', SLOT_RULES.logo.maxSizeBytes + 1);
    await expect(
      service.publish({ slot: 'logo', pathname: 'site/logo/huge.png', publishedBy: 'a@b.c' })
    ).rejects.toMatchObject({ statusCode: 422, code: 'ASSET_REJECTED' });
    expect(blob.deleted).toEqual(['site/logo/huge.png']);
    expect(await store.getBySlot('logo')).toBeNull();
  });
});

describe('SiteAssetService.restoreDefault', () => {
  it('removes the row and the blob, and clears the cache', async () => {
    blob.seed('site/logo/a.png', 'image/png', 10);
    await service.publish({ slot: 'logo', pathname: 'site/logo/a.png', publishedBy: 'a@b.c' });
    await service.getPublished();

    await service.restoreDefault('logo');

    expect(await store.getBySlot('logo')).toBeNull();
    expect(blob.deleted).toContain('site/logo/a.png');
    expect(cache.store.size).toBe(0);
  });

  it('is a no-op on an empty slot', async () => {
    await expect(service.restoreDefault('hero')).resolves.toBeUndefined();
    expect(blob.deleted).toEqual([]);
  });
});

describe('SiteAssetService.handleClientUpload', () => {
  it('attaches the slot rules to the token when the pathname matches the slot', async () => {
    const rules = (await service.handleClientUpload(undefined as never, {
      pathname: 'site/hero/20261010-clip.mp4',
      clientPayload: JSON.stringify({ slot: 'hero' })
    } as never)) as ClientTokenRules;

    expect(rules.allowedContentTypes).toEqual(SLOT_RULES.hero.allowedContentTypes);
    expect(rules.maximumSizeInBytes).toBe(SLOT_RULES.hero.maxSizeBytes);
  });

  it('refuses an unknown slot or a pathname under another prefix', async () => {
    await expect(
      service.handleClientUpload(undefined as never, {
        pathname: 'site/hero/x.mp4',
        clientPayload: JSON.stringify({ slot: 'banner' })
      } as never)
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      service.handleClientUpload(undefined as never, {
        pathname: 'site/logo/x.png',
        clientPayload: JSON.stringify({ slot: 'hero' })
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_UPLOAD_PATH' });
  });
});
