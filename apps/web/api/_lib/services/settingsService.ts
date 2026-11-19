import {
  MAIL_SETTING_KEYS,
  MAIL_SENDER_KEY,
  MAIL_SETTINGS,
  validateMailRecipients,
  validateMailSender,
  type MailRecipients,
  type MailSender,
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

/** Admin view of the sender setting. */
export interface MailSenderView {
  key: typeof MAIL_SENDER_KEY;
  /** `db` when an Admin saved it; `env` when MAIL_FROM is being used. */
  source: 'db' | 'env';
  value: MailSender;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface SettingsServiceDeps {
  store: SettingsStore;
  cache: Cache;
  /** ADMIN_EMAIL: the recipient used until an Admin saves a list. */
  defaultAdminEmail: string;
  /** MAIL_FROM: the sender used until an Admin saves one. */
  defaultMailFrom: string;
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
  async listMailSettingsForAdmin(): Promise<{
    items: MailSettingView[];
    sender: MailSenderView;
    storeAvailable: boolean;
  }> {
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
    const senderRow = rows.get(MAIL_SENDER_KEY);
    const senderCheck = senderRow ? validateMailSender(senderRow.value) : null;
    const sender =
      senderRow && senderCheck?.ok && senderCheck.value
        ? toSenderView(senderCheck.value, senderRow)
        : toSenderView(this.defaultSender(), null);
    return { items, sender, storeAvailable };
  }

  /**
   * The "From" every email should use right now: the saved sender, else
   * MAIL_FROM. Like recipients, a read failure never blocks a send.
   */
  async getMailSender(): Promise<string> {
    const cacheKey = cacheKeys.setting(MAIL_SENDER_KEY);
    const cached = await this.deps.cache.get<MailSender>(cacheKey);
    if (cached?.from) return cached.from;

    let stored: unknown;
    try {
      stored = (await this.deps.store.get(MAIL_SENDER_KEY))?.value;
    } catch (error) {
      log.warn('Could not read sender setting; using MAIL_FROM', {
        message: error instanceof Error ? error.message : String(error)
      });
      return this.defaultSender().from;
    }

    let value = this.defaultSender();
    if (stored != null) {
      const check = validateMailSender(stored);
      if (check.ok && check.value) value = check.value;
      else log.warn('Stored sender is malformed; using MAIL_FROM', { reason: check.reason });
    }
    await this.deps.cache.set(cacheKey, value, CACHE_TTL_SECONDS.setting);
    return value.from;
  }

  async saveMailSender(input: unknown, updatedBy: string): Promise<MailSenderView> {
    const check = validateMailSender(input);
    if (!check.ok || !check.value) {
      throw new DomainError(check.reason ?? 'Invalid sender', 422, 'INVALID_SETTING');
    }
    const row = await this.deps.store.set(MAIL_SENDER_KEY, check.value, updatedBy);
    await this.deps.cache.delete(cacheKeys.setting(MAIL_SENDER_KEY));
    log.info('Mail sender updated', { by: updatedBy });
    return toSenderView(check.value, row);
  }

  async resetMailSender(): Promise<void> {
    await this.deps.store.remove(MAIL_SENDER_KEY);
    await this.deps.cache.delete(cacheKeys.setting(MAIL_SENDER_KEY));
    log.info('Mail sender reset to MAIL_FROM');
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

  private defaultSender(): MailSender {
    return { from: this.deps.defaultMailFrom.trim() };
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

function toSenderView(value: MailSender, row: SettingRecord | null): MailSenderView {
  return {
    key: MAIL_SENDER_KEY,
    source: row ? 'db' : 'env',
    value,
    updatedBy: row?.updatedBy ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null
  };
}
