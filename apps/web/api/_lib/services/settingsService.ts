import {
  MAIL_SETTING_KEYS,
  MAIL_SETTINGS,
  validateMailRecipients,
  type MailRecipients,
  type MailSettingKey
} from '../../../shared/siteSettings.js';
import type { Cache } from '../cache/cache.js';
import { CACHE_TTL_SECONDS, cacheKeys } from '../cache/keys.js';
import type { SettingRecord, SettingsStore } from '../lib/settings/settingsStore.js';
import { DomainError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('settings');

/** Admin view of one mail setting: effective value plus where it comes from. */
export interface MailSettingView {
  key: MailSettingKey;
  label: string;
  description: string;
  /** `db` when an Admin saved it; `env` when ADMIN_EMAIL is being used. */
  source: 'db' | 'env';
  value: MailRecipients;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface SettingsServiceDeps {
  store: SettingsStore;
  cache: Cache;
  /** ADMIN_EMAIL: the recipient used until an Admin saves a list. */
  defaultAdminEmail: string;
}

/**
 * Site Settings. Each key is code-declared with its own validator; the store
 * only sees JSON. Reads are cached and always have a safe answer, so a missing
 * table or a bad row can never stop an email from going out.
 */
export class SettingsService {
  constructor(private readonly deps: SettingsServiceDeps) {}

  /** What the mailer should use for an internal flow right now. */
  async getMailRecipients(key: MailSettingKey): Promise<MailRecipients> {
    const cacheKey = cacheKeys.setting(key);
    const cached = await this.deps.cache.get<MailRecipients>(cacheKey);
    if (cached) return cached;

    let stored: unknown;
    try {
      stored = (await this.deps.store.get(key))?.value;
    } catch (error) {
      log.warn('Could not read setting; using env default', {
        key,
        message: error instanceof Error ? error.message : String(error)
      });
      return this.defaultRecipients();
    }

    const value = stored == null ? this.defaultRecipients() : this.parseStored(key, stored);
    await this.deps.cache.set(cacheKey, value, CACHE_TTL_SECONDS.setting);
    return value;
  }

  /**
   * Admin listing. `storeAvailable` is false when the table cannot be read
   * (typically not migrated yet); every key then shows its env default.
   */
  async listMailSettingsForAdmin(): Promise<{ items: MailSettingView[]; storeAvailable: boolean }> {
    let storeAvailable = true;
    let rows = new Map<string, SettingRecord>();
    try {
      rows = new Map((await this.deps.store.listAll()).map((row) => [row.key, row]));
    } catch (error) {
      storeAvailable = false;
      log.warn('Could not list settings; showing env defaults', {
        message: error instanceof Error ? error.message : String(error)
      });
    }
    const items = MAIL_SETTING_KEYS.map((key): MailSettingView => {
      const row = rows.get(key);
      const parsed = row ? validateMailRecipients(row.value) : null;
      return row && parsed?.ok && parsed.value
        ? toView(key, parsed.value, row)
        : toView(key, this.defaultRecipients(), null);
    });
    return { items, storeAvailable };
  }

  async saveMailRecipients(
    key: MailSettingKey,
    input: unknown,
    updatedBy: string
  ): Promise<MailSettingView> {
    const check = validateMailRecipients(input);
    if (!check.ok || !check.value) {
      throw new DomainError(check.reason ?? 'Invalid setting value', 422, 'INVALID_SETTING');
    }
    const row = await this.deps.store.set(key, check.value, updatedBy);
    await this.deps.cache.delete(cacheKeys.setting(key));
    log.info('Mail recipients updated', { key, by: updatedBy, to: check.value.to.length, cc: check.value.cc.length });
    return toView(key, check.value, row);
  }

  async resetMailRecipients(key: MailSettingKey): Promise<void> {
    await this.deps.store.remove(key);
    await this.deps.cache.delete(cacheKeys.setting(key));
    log.info('Mail recipients reset to env default', { key });
  }

  /**
   * One test send per flow per minute, so a stuck button cannot spam the
   * recipients. Throws 429 when the slot is taken.
   */
  async claimTestSendSlot(key: MailSettingKey): Promise<void> {
    const cacheKey = cacheKeys.settingTestSend(key);
    if (await this.deps.cache.get<boolean>(cacheKey)) {
      throw new DomainError(
        'Ya se envió una prueba hace menos de un minuto. Espera un momento.',
        429,
        'TEST_SEND_THROTTLED'
      );
    }
    await this.deps.cache.set(cacheKey, true, CACHE_TTL_SECONDS.settingTestSend);
  }

  /** Frees the slot so a failed send does not lock the flow for a minute. */
  async releaseTestSendSlot(key: MailSettingKey): Promise<void> {
    await this.deps.cache.delete(cacheKeys.settingTestSend(key));
  }

  private defaultRecipients(): MailRecipients {
    return { to: [this.deps.defaultAdminEmail.trim().toLowerCase()], cc: [] };
  }

  private parseStored(key: MailSettingKey, stored: unknown): MailRecipients {
    const check = validateMailRecipients(stored);
    if (check.ok && check.value) return check.value;
    log.warn('Stored setting is malformed; using env default', { key, reason: check.reason });
    return this.defaultRecipients();
  }
}

function toView(key: MailSettingKey, value: MailRecipients, row: SettingRecord | null): MailSettingView {
  return {
    key,
    ...MAIL_SETTINGS[key],
    source: row ? 'db' : 'env',
    value,
    updatedBy: row?.updatedBy ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null
  };
}
