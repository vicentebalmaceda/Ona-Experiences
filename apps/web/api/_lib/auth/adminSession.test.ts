import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_TTL_MS,
  authenticateAdminLogin,
  buildAdminSessionCookie,
  buildClearedAdminSessionCookie,
  createAdminSessionToken,
  parseAdminEmails,
  readCookie,
  verifyAdminSessionToken
} from './adminSession.js';

const secret = 'test-session-secret-at-least-32-chars!!';
const now = new Date('2026-09-24T18:00:00.000Z');

describe('adminSession', () => {
  it('parses allowlisted admin emails', () => {
    expect(parseAdminEmails(' Ada@Ona.example , bob@ona.example ')).toEqual([
      'ada@ona.example',
      'bob@ona.example'
    ]);
  });

  it('issues a verifiable session token that expires after 12 hours', () => {
    const { token, expiresAt } = createAdminSessionToken('ada@ona.example', secret, now);
    expect(expiresAt.getTime()).toBe(now.getTime() + ADMIN_SESSION_TTL_MS);
    expect(verifyAdminSessionToken(token, secret, now)?.email).toBe('ada@ona.example');
    expect(
      verifyAdminSessionToken(token, secret, new Date(expiresAt.getTime() + 1))
    ).toBeNull();
  });

  it('rejects tampered tokens', () => {
    const { token } = createAdminSessionToken('ada@ona.example', secret, now);
    const [body] = token.split('.');
    expect(verifyAdminSessionToken(`${body}.aaaa`, secret, now)).toBeNull();
  });

  it('authenticates only allowlisted emails with the shared password', () => {
    const config = {
      emails: ['ada@ona.example'],
      password: 'correct-horse',
      sessionSecret: secret,
      secureCookies: false,
      now: () => now
    };
    expect(authenticateAdminLogin(config, 'ada@ona.example', 'correct-horse')?.email).toBe(
      'ada@ona.example'
    );
    expect(authenticateAdminLogin(config, 'eve@ona.example', 'correct-horse')).toBeNull();
    expect(authenticateAdminLogin(config, 'ada@ona.example', 'wrong')).toBeNull();
  });

  it('builds httpOnly SameSite=Strict cookies and clears them', () => {
    const cookie = buildAdminSessionCookie('tok', now, true);
    expect(cookie).toContain('ona_admin_session=tok');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    expect(buildClearedAdminSessionCookie(false)).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('reads a named cookie from the Cookie header', () => {
    expect(readCookie('a=1; ona_admin_session=abc%2Edef; b=2', 'ona_admin_session')).toBe(
      'abc.def'
    );
  });
});
