import type { SiteAssetKind, SiteAssetSlot } from '../../../../shared/siteAssetSlots.js';

/** The file currently published in an Asset Slot. */
export interface SiteAssetRecord {
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
  publishedAt: Date;
}

export type UpsertSiteAssetInput = Omit<SiteAssetRecord, 'publishedAt'>;

export interface SiteAssetStore {
  listAll(): Promise<SiteAssetRecord[]>;
  getBySlot(slot: SiteAssetSlot): Promise<SiteAssetRecord | null>;
  upsert(input: UpsertSiteAssetInput): Promise<SiteAssetRecord>;
  /** Removes the row; returns the removed record so the caller can delete the blob. */
  remove(slot: SiteAssetSlot): Promise<SiteAssetRecord | null>;
}
