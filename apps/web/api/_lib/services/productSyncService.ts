import type { ReviewStore } from '../lib/reviews/reviewStore.js';
import type { BsaleProduct } from '../types/bsale.js';
import type { CatalogType } from '../types/catalog.js';
import type { ProductRecord } from '../types/reviews.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('product-sync');

const CATALOG_TYPES: CatalogType[] = ['lodge', 'guide'];

export interface CatalogProductSource {
  listAllProducts(type: CatalogType): Promise<BsaleProduct[]>;
}

export type ProductSyncStatus = 'created' | 'updated' | 'unchanged' | 'deactivated';

export interface ProductSyncItem {
  catalogType: CatalogType;
  bsaleProductId: number;
  name: string;
  active: boolean;
  previousName: string | null;
  previousActive: boolean | null;
  status: ProductSyncStatus;
}

export interface ProductSyncResult {
  syncedAt: string;
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  items: ProductSyncItem[];
}

export interface ProductSyncServiceDeps {
  source: CatalogProductSource;
  store: ReviewStore;
  now?: () => Date;
}

function externalKey(catalogType: CatalogType, bsaleProductId: number): string {
  return `${catalogType}:${bsaleProductId}`;
}

/**
 * Mirrors BSale lodge/guide products into the local `products` table.
 * `active` follows BSale product state (0 = active), matching quote capture.
 * Local rows whose product left the BSale product type are deactivated, never deleted,
 * because quotes, invites and reviews reference them.
 */
export class ProductSyncService {
  private readonly now: () => Date;

  constructor(private readonly deps: ProductSyncServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async syncFromBsale(): Promise<ProductSyncResult> {
    const remoteByType = await Promise.all(
      CATALOG_TYPES.map(async (type) => ({
        type,
        products: await this.deps.source.listAllProducts(type)
      }))
    );

    const localProducts = await this.deps.store.listProducts();
    const localByKey = new Map<string, ProductRecord>(
      localProducts.map((product) => [externalKey(product.catalogType, product.bsaleProductId), product])
    );

    const items: ProductSyncItem[] = [];
    const seenKeys = new Set<string>();

    for (const { type, products } of remoteByType) {
      for (const remote of products) {
        const key = externalKey(type, remote.id);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const name = remote.name.trim();
        const active = remote.state === 0;
        const local = localByKey.get(key);

        if (local && local.name === name && local.active === active) {
          items.push(toItem(type, remote.id, name, active, local, 'unchanged'));
          continue;
        }

        await this.deps.store.upsertProduct({
          catalogType: type,
          bsaleProductId: remote.id,
          name,
          active
        });
        items.push(toItem(type, remote.id, name, active, local ?? null, local ? 'updated' : 'created'));
      }
    }

    for (const local of localProducts) {
      if (seenKeys.has(externalKey(local.catalogType, local.bsaleProductId))) continue;

      if (!local.active) {
        items.push(toItem(local.catalogType, local.bsaleProductId, local.name, false, local, 'unchanged'));
        continue;
      }

      await this.deps.store.upsertProduct({
        catalogType: local.catalogType,
        bsaleProductId: local.bsaleProductId,
        name: local.name,
        active: false
      });
      items.push(
        toItem(local.catalogType, local.bsaleProductId, local.name, false, local, 'deactivated')
      );
    }

    const result: ProductSyncResult = {
      syncedAt: this.now().toISOString(),
      created: items.filter((item) => item.status === 'created').length,
      updated: items.filter((item) => item.status === 'updated').length,
      deactivated: items.filter((item) => item.status === 'deactivated').length,
      unchanged: items.filter((item) => item.status === 'unchanged').length,
      items
    };

    log.info('Products synced from BSale', {
      created: result.created,
      updated: result.updated,
      deactivated: result.deactivated,
      unchanged: result.unchanged
    });

    return result;
  }
}

function toItem(
  catalogType: CatalogType,
  bsaleProductId: number,
  name: string,
  active: boolean,
  previous: ProductRecord | null,
  status: ProductSyncStatus
): ProductSyncItem {
  return {
    catalogType,
    bsaleProductId,
    name,
    active,
    previousName: previous?.name ?? null,
    previousActive: previous?.active ?? null,
    status
  };
}
