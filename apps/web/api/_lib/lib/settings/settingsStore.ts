/** One row of `site_settings`: a JSON value under a code-declared key. */
export interface SettingRecord {
  key: string;
  value: unknown;
  updatedBy: string;
  updatedAt: Date;
}

export interface SettingsStore {
  listAll(): Promise<SettingRecord[]>;
  get(key: string): Promise<SettingRecord | null>;
  set(key: string, value: unknown, updatedBy: string): Promise<SettingRecord>;
  /** Returns true when a row was removed. */
  remove(key: string): Promise<boolean>;
}
