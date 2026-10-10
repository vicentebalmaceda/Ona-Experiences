import type { NeonQueryFunction } from '@neondatabase/serverless';
import { asDate } from '../../db/postgres.js';
import type { SiteAssetKind, SiteAssetSlot } from '../../../../shared/siteAssetSlots.js';
import type { SiteAssetRecord, SiteAssetStore, UpsertSiteAssetInput } from './siteAssetStore.js';

interface SiteAssetRow {
  slot: SiteAssetSlot;
  kind: SiteAssetKind;
  url: string;
  pathname: string;
  content_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  published_by: string;
  published_at: Date | string;
}

export class PostgresSiteAssetStore implements SiteAssetStore {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async listAll(): Promise<SiteAssetRecord[]> {
    const rows = await this.sql`
      SELECT slot, kind, url, pathname, content_type, size_bytes, width, height, alt,
        published_by, published_at
      FROM site_assets
      ORDER BY slot
    `;
    return (rows as SiteAssetRow[]).map(toRecord);
  }

  async getBySlot(slot: SiteAssetSlot): Promise<SiteAssetRecord | null> {
    const rows = await this.sql`
      SELECT slot, kind, url, pathname, content_type, size_bytes, width, height, alt,
        published_by, published_at
      FROM site_assets
      WHERE slot = ${slot}
      LIMIT 1
    `;
    return rows[0] ? toRecord(rows[0] as SiteAssetRow) : null;
  }

  async upsert(input: UpsertSiteAssetInput): Promise<SiteAssetRecord> {
    const rows = await this.sql`
      INSERT INTO site_assets (
        slot, kind, url, pathname, content_type, size_bytes, width, height, alt,
        published_by, published_at
      )
      VALUES (
        ${input.slot}, ${input.kind}, ${input.url}, ${input.pathname}, ${input.contentType},
        ${input.sizeBytes}, ${input.width}, ${input.height}, ${input.alt},
        ${input.publishedBy}, now()
      )
      ON CONFLICT (slot)
      DO UPDATE SET
        kind = excluded.kind,
        url = excluded.url,
        pathname = excluded.pathname,
        content_type = excluded.content_type,
        size_bytes = excluded.size_bytes,
        width = excluded.width,
        height = excluded.height,
        alt = excluded.alt,
        published_by = excluded.published_by,
        published_at = now()
      RETURNING slot, kind, url, pathname, content_type, size_bytes, width, height, alt,
        published_by, published_at
    `;
    return toRecord(rows[0] as SiteAssetRow);
  }

  async remove(slot: SiteAssetSlot): Promise<SiteAssetRecord | null> {
    const rows = await this.sql`
      DELETE FROM site_assets
      WHERE slot = ${slot}
      RETURNING slot, kind, url, pathname, content_type, size_bytes, width, height, alt,
        published_by, published_at
    `;
    return rows[0] ? toRecord(rows[0] as SiteAssetRow) : null;
  }
}

function toRecord(row: SiteAssetRow): SiteAssetRecord {
  return {
    slot: row.slot,
    kind: row.kind,
    url: row.url,
    pathname: row.pathname,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    alt: row.alt ?? null,
    publishedBy: row.published_by,
    publishedAt: asDate(row.published_at)
  };
}
