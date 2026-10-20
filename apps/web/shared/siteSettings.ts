/**
 * Site Settings: admin-editable configuration stored in the `site_settings`
 * table as one JSON value per key. Keys are declared here, not created by
 * admins, so every value has a known shape and a validator.
 *
 * Dependency-free on purpose: the BFF validates on write and the admin SPA
 * validates before sending, both through this module. Lives in `shared/`
 * because the Vite dev proxy would 404 anything under `api/`.
 */

/** Internal email flows whose recipients an Admin can change. */
export const MAIL_SETTING_KEYS = ['mail.contact', 'mail.quote', 'mail.review_admin'] as const;
export type MailSettingKey = (typeof MAIL_SETTING_KEYS)[number];

export interface MailRecipients {
  to: string[];
  cc: string[];
}

export interface MailSettingDefinition {
  /** Spanish label for the admin card. */
  label: string;
  /** Spanish sentence saying when this email is sent. */
  description: string;
}

export const MAIL_SETTINGS: Record<MailSettingKey, MailSettingDefinition> = {
  'mail.contact': {
    label: 'Formulario de contacto',
    description: 'Se envía cada vez que alguien completa el formulario de contacto del sitio.'
  },
  'mail.quote': {
    label: 'Nueva cotización',
    description: 'Se envía cuando BSale emite una cotización solicitada desde el sitio.'
  },
  'mail.review_admin': {
    label: 'Nueva reseña',
    description: 'Se envía cuando un cliente publica una reseña, para poder ocultarla si hace falta.'
  }
};

export const MAX_RECIPIENTS_PER_LIST = 10;

// Pragmatic address check: one @, no spaces, a dot in the domain. Resend does
// the authoritative validation when sending.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/** Trim, lowercase, drop blanks, dedupe (first occurrence wins). */
export function normalizeEmailList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const email = String(raw ?? '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export interface MailRecipientsCheck {
  ok: boolean;
  value?: MailRecipients;
  /** Spanish, safe to show to the admin. */
  reason?: string;
}

/**
 * The one rule set both the browser and the BFF apply before saving or
 * test-sending a recipient list.
 */
export function validateMailRecipients(input: unknown): MailRecipientsCheck {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'Formato inválido.' };
  }
  const raw = input as { to?: unknown; cc?: unknown };
  if (!Array.isArray(raw.to) || (raw.cc != null && !Array.isArray(raw.cc))) {
    return { ok: false, reason: 'Formato inválido: "to" y "cc" deben ser listas.' };
  }

  const to = normalizeEmailList(raw.to as string[]);
  const cc = normalizeEmailList((raw.cc ?? []) as string[]);

  if (to.length === 0) {
    return { ok: false, reason: 'Debes indicar al menos un destinatario en "Para".' };
  }
  if (to.length > MAX_RECIPIENTS_PER_LIST || cc.length > MAX_RECIPIENTS_PER_LIST) {
    return { ok: false, reason: `Máximo ${MAX_RECIPIENTS_PER_LIST} direcciones por lista.` };
  }

  const invalid = [...to, ...cc].filter((email) => !isValidEmail(email));
  if (invalid.length > 0) {
    return { ok: false, reason: `Dirección no válida: ${invalid.join(', ')}.` };
  }

  const duplicated = cc.filter((email) => to.includes(email));
  if (duplicated.length > 0) {
    return { ok: false, reason: `Repetida en "Para" y "CC": ${duplicated.join(', ')}.` };
  }

  return { ok: true, value: { to, cc } };
}
