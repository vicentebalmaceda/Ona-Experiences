import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ADMIN_SESSION_COOKIE,
  authenticateAdminLogin,
  buildAdminSessionCookie,
  buildClearedAdminSessionCookie,
  parseAdminEmails,
  readCookie,
  verifyAdminSessionToken,
  type AdminAuthConfig
} from '../auth/adminSession.js';
import { getEnv } from '../config/env.js';
import { DomainError } from '../types/errors.js';

export function adminAuthConfigFromEnv(): AdminAuthConfig {
  const env = getEnv();
  return {
    emails: parseAdminEmails(env.ADMIN_EMAILS),
    password: env.ADMIN_PASSWORD,
    sessionSecret: env.ADMIN_SESSION_SECRET,
    secureCookies: env.NODE_ENV === 'production'
  };
}

export function requireAdminSession(req: VercelRequest): { email: string } {
  const token = readCookie(
    typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
    ADMIN_SESSION_COOKIE
  );
  if (!token) {
    throw new DomainError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const config = adminAuthConfigFromEnv();
  const session = verifyAdminSessionToken(token, config.sessionSecret);
  if (!session) {
    throw new DomainError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  return { email: session.email };
}

export function setAdminSessionCookie(
  res: VercelResponse,
  token: string,
  expiresAt: Date,
  secure: boolean
): void {
  res.setHeader('Set-Cookie', buildAdminSessionCookie(token, expiresAt, secure));
}

export function clearAdminSessionCookie(res: VercelResponse, secure: boolean): void {
  res.setHeader('Set-Cookie', buildClearedAdminSessionCookie(secure));
}

export function tryAdminLogin(
  email: string,
  password: string
): { token: string; expiresAt: Date; email: string } | null {
  return authenticateAdminLogin(adminAuthConfigFromEnv(), email, password);
}
