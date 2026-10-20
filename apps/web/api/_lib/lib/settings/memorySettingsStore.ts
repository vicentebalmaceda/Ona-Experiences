import type { SettingRecord, SettingsStore } from './settingsStore.js';

export class MemorySettingsStore implements SettingsStore {
  readonly rows = new Map<string, SettingRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async listAll(): Promise<SettingRecord[]> {
    return [...this.rows.values()];
  }

  async get(key: string): Promise<SettingRecord | null> {
    return this.rows.get(key) ?? null;
  }

  async set(key: string, value: unknown, updatedBy: string): Promise<SettingRecord> {
    const record: SettingRecord = { key, value, updatedBy, updatedAt: this.now() };
    this.rows.set(key, record);
    return record;
  }

  async remove(key: string): Promise<boolean> {
    return this.rows.delete(key);
  }
}
