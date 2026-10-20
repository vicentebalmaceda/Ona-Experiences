import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  MAIL_SETTING_KEYS,
  MAIL_SETTINGS,
  normalizeEmailList,
  validateMailRecipients
} from './siteSettings.js';

describe('mail setting keys', () => {
  it('declares one key per internal email flow with Spanish labels', () => {
    expect(MAIL_SETTING_KEYS).toEqual(['mail.contact', 'mail.quote', 'mail.review_admin']);
    for (const key of MAIL_SETTING_KEYS) {
      expect(MAIL_SETTINGS[key].label).toBeTruthy();
      expect(MAIL_SETTINGS[key].description).toBeTruthy();
    }
  });
});

describe('isValidEmail', () => {
  it('accepts ordinary addresses and rejects junk', () => {
    expect(isValidEmail('ops@onaexperiences.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.domain.cl')).toBe(true);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('two@@at.com')).toBe(false);
    expect(isValidEmail('spaces in@x.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('normalizeEmailList', () => {
  it('trims, lowercases, drops blanks and dedupes keeping order', () => {
    expect(normalizeEmailList([' Ops@Ona.com ', '', 'ops@ona.com', 'b@ona.com'])).toEqual([
      'ops@ona.com',
      'b@ona.com'
    ]);
  });
});

describe('validateMailRecipients', () => {
  it('returns a normalized value for a good payload', () => {
    const result = validateMailRecipients({ to: ['Ops@Ona.com'], cc: ['Copy@Ona.com', 'copy@ona.com'] });
    expect(result).toEqual({ ok: true, value: { to: ['ops@ona.com'], cc: ['copy@ona.com'] } });
  });

  it('treats a missing cc as empty', () => {
    expect(validateMailRecipients({ to: ['a@b.co'] })).toEqual({
      ok: true,
      value: { to: ['a@b.co'], cc: [] }
    });
  });

  it('requires at least one recipient in to', () => {
    const result = validateMailRecipients({ to: [], cc: ['a@b.co'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/al menos un destinatario/i);
  });

  it('rejects invalid addresses and names them', () => {
    const result = validateMailRecipients({ to: ['ok@b.co', 'bad address'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('bad address');
  });

  it('rejects an address present in both to and cc', () => {
    const result = validateMailRecipients({ to: ['a@b.co'], cc: ['A@b.co'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/a@b.co/);
  });

  it('caps each list at 10 addresses', () => {
    const many = Array.from({ length: 11 }, (_, i) => `u${i}@b.co`);
    expect(validateMailRecipients({ to: many }).ok).toBe(false);
    expect(validateMailRecipients({ to: ['a@b.co'], cc: many }).ok).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(validateMailRecipients(null).ok).toBe(false);
    expect(validateMailRecipients({ to: 'a@b.co' }).ok).toBe(false);
  });
});
