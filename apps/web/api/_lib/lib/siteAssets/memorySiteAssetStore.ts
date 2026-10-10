import type { SiteAssetSlot } from '../../../../shared/siteAssetSlots.js';
import type { SiteAssetRecord, SiteAssetStore, UpsertSiteAssetInput } from './siteAssetStore.js';

export class MemorySiteAssetStore implements SiteAssetStore {
  readonly assets = new Map<SiteAssetSlot, SiteAssetRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async listAll(): Promise<SiteAssetRecord[]> {
    return [...this.assets.values()];
  }

  async getBySlot(slot: SiteAssetSlot): Promise<SiteAssetRecord | null> {
    return this.assets.get(slot) ?? null;
  }

  async upsert(input: UpsertSiteAssetInput): Promise<SiteAssetRecord> {
    const record: SiteAssetRecord = { ...input, publishedAt: this.now() };
    this.assets.set(input.slot, record);
    return record;
  }

  async remove(slot: SiteAssetSlot): Promise<SiteAssetRecord | null> {
    const existing = this.assets.get(slot) ?? null;
    this.assets.delete(slot);
    return existing;
  }
}
