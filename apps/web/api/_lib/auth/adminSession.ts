import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'ona_admin_session';
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface AdminSessionPayload {
  email: string;
  exp: number;
}

export interface AdminAuthConfig {
  emails: string[];
  password: string;
  sessionSecret: string;
  /** When true, Set-Cookie includes Secure (production). */
  secureCookies: boolean;
  now?: () => Date;
}

function base64UrlEncode(value: string | Buffer): string {
  const buf = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return buf.toString('base64url');
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function parseAdminEmails(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminSessionToken(
  email: string,
  secret: string,
  now: Date = new Date()
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_MS);
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    exp: expiresAt.getTime()
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(body).digest();
  return { token: `${body}.${base64UrlEncode(sig)}`, expiresAt };
}

export function verifyAdminSessionToken(
  token: string,
  secret: string,
  now: Date = new Date()
): AdminSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigPart] = parts;
  if (!body || !sigPart) return null;

  const expected = createHmac('sha256', secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = base64UrlDecode(sigPart);
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body).toString('utf8')) as AdminSessionPayload;
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp <= now.getTime()) return null;
    return { email: payload.email.toLowerCase(), exp: payload.exp };
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1).trim());
  }
  return null;
}

export function buildAdminSessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean
): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Expires=${expiresAt.toUTCString()}`,
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearedAdminSessionCookie(secure: boolean): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function authenticateAdminLogin(
  config: AdminAuthConfig,
  email: string,
  password: string
): { token: string; expiresAt: Date; email: string } | null {
  const normalized = email.trim().toLowerCase();
  if (!config.emails.includes(normalized)) return null;
  if (!passwordsMatch(password, config.password)) return null;
  const now = config.now?.() ?? new Date();
  const { token, expiresAt } = createAdminSessionToken(normalized, config.sessionSecret, now);
  return { token, expiresAt, email: normalized };
}
