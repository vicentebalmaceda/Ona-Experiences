import type { NeonQueryFunction } from '@neondatabase/serverless';
import { asDate } from '../../db/postgres.js';
import type { SettingRecord, SettingsStore } from './settingsStore.js';

interface SettingRow {
  key: string;
  value: unknown;
  updated_by: string;
  updated_at: Date | string;
}

export class PostgresSettingsStore implements SettingsStore {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async listAll(): Promise<SettingRecord[]> {
    const rows = await this.sql`
      SELECT key, value, updated_by, updated_at
      FROM site_settings
      ORDER BY key
    `;
    return (rows as SettingRow[]).map(toRecord);
  }

  async get(key: string): Promise<SettingRecord | null> {
    const rows = await this.sql`
      SELECT key, value, updated_by, updated_at
      FROM site_settings
      WHERE key = ${key}
      LIMIT 1
    `;
    return rows[0] ? toRecord(rows[0] as SettingRow) : null;
  }

  async set(key: string, value: unknown, updatedBy: string): Promise<SettingRecord> {
    const rows = await this.sql`
      INSERT INTO site_settings (key, value, updated_by, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${updatedBy}, now())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = now()
      RETURNING key, value, updated_by, updated_at
    `;
    return toRecord(rows[0] as SettingRow);
  }

  async remove(key: string): Promise<boolean> {
    const rows = await this.sql`
      DELETE FROM site_settings WHERE key = ${key} RETURNING key
    `;
    return rows.length > 0;
  }
}

function toRecord(row: SettingRow): SettingRecord {
  return {
    key: row.key,
    value: row.value,
    updatedBy: row.updated_by,
    updatedAt: asDate(row.updated_at)
  };
}
