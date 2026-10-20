import { beforeEach, describe, expect, it } from 'vitest';
import type { Cache } from '../cache/cache.js';
import { MemorySettingsStore } from '../lib/settings/memorySettingsStore.js';
import { SettingsService } from './settingsService.js';

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
  async deleteByPrefix(prefix: string) {
    for (const key of [...this.store.keys()]) if (key.startsWith(prefix)) this.store.delete(key);
  }
}

let store: MemorySettingsStore;
let cache: FakeCache;
let service: SettingsService;

beforeEach(() => {
  store = new MemorySettingsStore(() => new Date('2026-10-20T10:00:00.000Z'));
  cache = new FakeCache();
  service = new SettingsService({ store, cache, defaultAdminEmail: 'Admin@Ona.example' });
});

describe('SettingsService.getMailRecipients', () => {
  it('falls back to ADMIN_EMAIL with no cc when nothing is saved', async () => {
    await expect(service.getMailRecipients('mail.quote')).resolves.toEqual({
      to: ['admin@ona.example'],
      cc: []
    });
  });

  it('returns the saved value and caches it', async () => {
    await store.set('mail.quote', { to: ['ventas@ona.example'], cc: ['jefe@ona.example'] }, 'a@b.c');

    const first = await service.getMailRecipients('mail.quote');
    expect(first).toEqual({ to: ['ventas@ona.example'], cc: ['jefe@ona.example'] });
    expect(cache.store.size).toBe(1);

    // A direct store change is not visible until the cache entry is cleared.
    await store.set('mail.quote', { to: ['otro@ona.example'], cc: [] }, 'a@b.c');
    expect(await service.getMailRecipients('mail.quote')).toEqual(first);
  });

  it('ignores a malformed stored value and falls back', async () => {
    await store.set('mail.contact', { to: 'not-a-list' }, 'a@b.c');
    await expect(service.getMailRecipients('mail.contact')).resolves.toEqual({
      to: ['admin@ona.example'],
      cc: []
    });
  });

  it('serves the fallback when the store fails (table not migrated)', async () => {
    const broken = new SettingsService({
      store: { ...store, get: async () => { throw new Error('relation does not exist'); } } as never,
      cache,
      defaultAdminEmail: 'admin@ona.example'
    });
    await expect(broken.getMailRecipients('mail.contact')).resolves.toEqual({
      to: ['admin@ona.example'],
      cc: []
    });
    expect(cache.store.size).toBe(0);
  });
});

describe('SettingsService.saveMailRecipients', () => {
  it('validates, normalizes, stores and clears the cache', async () => {
    await service.getMailRecipients('mail.contact');
    expect(cache.store.size).toBe(1);

    const view = await service.saveMailRecipients(
      'mail.contact',
      { to: [' Ops@Ona.example '], cc: ['copia@ona.example'] },
      'admin@ona.example'
    );

    expect(view).toMatchObject({
      key: 'mail.contact',
      source: 'db',
      value: { to: ['ops@ona.example'], cc: ['copia@ona.example'] },
      updatedBy: 'admin@ona.example',
      updatedAt: '2026-10-20T10:00:00.000Z'
    });
    expect(cache.store.size).toBe(0);
    await expect(service.getMailRecipients('mail.contact')).resolves.toEqual(view.value);
  });

  it('rejects an invalid list with a 422 DomainError carrying the Spanish reason', async () => {
    await expect(
      service.saveMailRecipients('mail.contact', { to: ['bad'], cc: [] }, 'a@b.c')
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_SETTING', message: expect.stringContaining('bad') });
    expect(await store.get('mail.contact')).toBeNull();
  });
});

describe('SettingsService.resetMailRecipients', () => {
  it('removes the row and clears the cache so the env default applies again', async () => {
    await service.saveMailRecipients('mail.quote', { to: ['x@y.z'] }, 'a@b.c');
    await service.getMailRecipients('mail.quote');

    await service.resetMailRecipients('mail.quote');

    expect(await store.get('mail.quote')).toBeNull();
    expect(cache.store.size).toBe(0);
    await expect(service.getMailRecipients('mail.quote')).resolves.toEqual({
      to: ['admin@ona.example'],
      cc: []
    });
  });
});

describe('SettingsService.listMailSettingsForAdmin', () => {
  it('returns every key with its effective value and source', async () => {
    await service.saveMailRecipients('mail.quote', { to: ['x@y.z'], cc: ['c@y.z'] }, 'a@b.c');

    const { items, storeAvailable } = await service.listMailSettingsForAdmin();

    expect(storeAvailable).toBe(true);
    expect(items.map((item) => item.key)).toEqual(['mail.contact', 'mail.quote', 'mail.review_admin']);
    expect(items[0]).toMatchObject({
      key: 'mail.contact',
      source: 'env',
      value: { to: ['admin@ona.example'], cc: [] },
      updatedBy: null,
      updatedAt: null
    });
    expect(items[1]).toMatchObject({ key: 'mail.quote', source: 'db', value: { to: ['x@y.z'], cc: ['c@y.z'] } });
  });
});

describe('SettingsService.listMailSettingsForAdmin without the table', () => {
  it('reports the store as unavailable and shows env defaults for every key', async () => {
    const broken = new SettingsService({
      store: { ...store, listAll: async () => { throw new Error('relation "site_settings" does not exist'); } } as never,
      cache,
      defaultAdminEmail: 'admin@ona.example'
    });

    const { items, storeAvailable } = await broken.listMailSettingsForAdmin();

    expect(storeAvailable).toBe(false);
    expect(items).toHaveLength(3);
    expect(items.every((item) => item.source === 'env')).toBe(true);
  });
});

describe('SettingsService.claimTestSendSlot', () => {
  it('allows one test send per minute per key', async () => {
    await expect(service.claimTestSendSlot('mail.quote')).resolves.toBeUndefined();
    await expect(service.claimTestSendSlot('mail.quote')).rejects.toMatchObject({ statusCode: 429 });
    await expect(service.claimTestSendSlot('mail.contact')).resolves.toBeUndefined();
  });

  it('can release the slot so a failed send does not block a retry', async () => {
    await service.claimTestSendSlot('mail.quote');
    await service.releaseTestSendSlot('mail.quote');
    await expect(service.claimTestSendSlot('mail.quote')).resolves.toBeUndefined();
  });
});
