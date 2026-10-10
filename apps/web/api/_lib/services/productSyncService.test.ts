import { describe, expect, it } from 'vitest';
import { MemoryReviewStore } from '../lib/reviews/memoryReviewStore.js';
import type { BsaleProduct } from '../types/bsale.js';
import type { CatalogType } from '../types/catalog.js';
import { ProductSyncService, type CatalogProductSource } from './productSyncService.js';

function bsaleProduct(id: number, name: string, state = 0): BsaleProduct {
  return { id, name, state, description: null, classification: 1 };
}

function source(products: Partial<Record<CatalogType, BsaleProduct[]>>): CatalogProductSource {
  return {
    listAllProducts: async (type) => products[type] ?? []
  };
}

const now = () => new Date('2026-10-10T12:00:00.000Z');

describe('ProductSyncService', () => {
  it('creates missing products and updates renamed or reactivated ones', async () => {
    const store = new MemoryReviewStore();
    await store.upsertProduct({ catalogType: 'lodge', bsaleProductId: 2018, name: 'Epu Lodge' });
    await store.upsertProduct({
      catalogType: 'lodge',
      bsaleProductId: 1509,
      name: 'Estancia Cameron Lodge'
    });
    await store.upsertProduct({
      catalogType: 'guide',
      bsaleProductId: 77,
      name: 'Guía Juan',
      active: false
    });

    const service = new ProductSyncService({
      source: source({
        lodge: [
          bsaleProduct(2018, 'Epu Lodge Futaleufú'),
          bsaleProduct(1509, 'Estancia Cameron Lodge'),
          bsaleProduct(2049, '  Mañihuales River Lodge ')
        ],
        guide: [bsaleProduct(77, 'Guía Juan', 0)]
      }),
      store,
      now
    });

    const result = await service.syncFromBsale();

    expect(result).toMatchObject({
      syncedAt: '2026-10-10T12:00:00.000Z',
      created: 1,
      updated: 2,
      deactivated: 0,
      unchanged: 1
    });
    expect(await store.getProductByExternalKey('lodge', 2018)).toMatchObject({
      name: 'Epu Lodge Futaleufú',
      active: true
    });
    expect(await store.getProductByExternalKey('lodge', 2049)).toMatchObject({
      name: 'Mañihuales River Lodge',
      active: true
    });
    expect(await store.getProductByExternalKey('guide', 77)).toMatchObject({ active: true });
    expect(result.items.find((item) => item.bsaleProductId === 2018)).toMatchObject({
      status: 'updated',
      previousName: 'Epu Lodge'
    });
  });

  it('marks inactive BSale products and products missing from BSale as inactive', async () => {
    const store = new MemoryReviewStore();
    await store.upsertProduct({ catalogType: 'lodge', bsaleProductId: 518, name: 'Matapiojo Old' });
    await store.upsertProduct({ catalogType: 'lodge', bsaleProductId: 999, name: 'Gone Lodge' });

    const service = new ProductSyncService({
      source: source({ lodge: [bsaleProduct(518, 'Matapiojo Old', 1)] }),
      store,
      now
    });

    const result = await service.syncFromBsale();

    expect(result).toMatchObject({ created: 0, updated: 1, deactivated: 1, unchanged: 0 });
    expect(await store.getProductByExternalKey('lodge', 518)).toMatchObject({ active: false });
    expect(await store.getProductByExternalKey('lodge', 999)).toMatchObject({
      name: 'Gone Lodge',
      active: false
    });
  });
});
