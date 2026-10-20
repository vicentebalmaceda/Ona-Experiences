import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminSessionToken } from '../auth/adminSession.js';
import { resetEnvForTests } from '../config/env.js';
import { createMockRes } from '../test/mockRes.js';
import { DomainError } from '../types/errors.js';
import {
  adminMailSettingByKeyHandler,
  adminMailSettingsHandler,
  adminMailSettingTestHandler
} from './adminSettings.js';

const settingsService = {
  listMailSettingsForAdmin: vi.fn(),
  saveMailRecipients: vi.fn(),
  resetMailRecipients: vi.fn(),
  claimTestSendSlot: vi.fn(),
  releaseTestSendSlot: vi.fn()
};
const testMailer = { sendTestEmail: vi.fn() };

vi.mock('../services/container.js', () => ({
  getServices: () => ({ settingsService, testMailer })
}));

function sessionCookie() {
  const { token } = createAdminSessionToken('admin@ona.example', process.env.ADMIN_SESSION_SECRET!);
  return `ona_admin_session=${encodeURIComponent(token)}`;
}

function request(method: string, url: string, extra: Record<string, unknown> = {}) {
  return {
    method,
    url,
    headers: { origin: 'http://localhost:5173', cookie: sessionCookie() },
    query: {},
    body: {},
    ...extra
  };
}

beforeEach(() => {
  resetEnvForTests();
  for (const fn of Object.values(settingsService)) fn.mockReset();
  testMailer.sendTestEmail.mockReset();
});

describe('admin mail settings handlers', () => {
  it('rejects every route without a session', async () => {
    for (const [handler, method] of [
      [adminMailSettingsHandler, 'GET'],
      [adminMailSettingByKeyHandler, 'PUT'],
      [adminMailSettingTestHandler, 'POST']
    ] as const) {
      const res = createMockRes();
      await handler({ ...request(method, '/api/v1/admin/settings'), headers: {} } as never, res as never);
      expect(res.statusCode).toBe(401);
    }
    expect(settingsService.saveMailRecipients).not.toHaveBeenCalled();
    expect(testMailer.sendTestEmail).not.toHaveBeenCalled();
  });

  it('lists settings with no-store', async () => {
    settingsService.listMailSettingsForAdmin.mockResolvedValue({ items: [{ key: 'mail.contact' }], storeAvailable: true });
    const res = createMockRes();

    await adminMailSettingsHandler(request('GET', '/api/v1/admin/settings') as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items: [{ key: 'mail.contact' }], storeAvailable: true });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('saves a list for a known key with the session email as author', async () => {
    settingsService.saveMailRecipients.mockResolvedValue({ key: 'mail.quote', source: 'db' });
    const res = createMockRes();

    await adminMailSettingByKeyHandler(
      request('PUT', '/api/v1/admin/settings/mail.quote', {
        query: { key: 'mail.quote' },
        body: { to: ['a@b.co'], cc: [] }
      }) as never,
      res as never
    );

    expect(res.statusCode).toBe(200);
    expect(settingsService.saveMailRecipients).toHaveBeenCalledWith(
      'mail.quote',
      { to: ['a@b.co'], cc: [] },
      'admin@ona.example'
    );
  });

  it('rejects an unknown key before touching the service', async () => {
    const res = createMockRes();

    await adminMailSettingByKeyHandler(
      request('PUT', '/api/v1/admin/settings/mail.from', { query: { key: 'mail.from' }, body: { to: ['a@b.co'] } }) as never,
      res as never
    );

    expect(res.statusCode).toBe(400);
    expect(settingsService.saveMailRecipients).not.toHaveBeenCalled();
  });

  it('resets a key on DELETE', async () => {
    settingsService.resetMailRecipients.mockResolvedValue(undefined);
    const res = createMockRes();

    await adminMailSettingByKeyHandler(
      request('DELETE', '/api/v1/admin/settings/mail.contact', { query: { key: 'mail.contact' } }) as never,
      res as never
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, key: 'mail.contact' });
    expect(settingsService.resetMailRecipients).toHaveBeenCalledWith('mail.contact');
  });

  it('validates the recipients, claims the throttle slot and sends the test email', async () => {
    settingsService.claimTestSendSlot.mockResolvedValue(undefined);
    testMailer.sendTestEmail.mockResolvedValue(undefined);
    const res = createMockRes();

    await adminMailSettingTestHandler(
      request('POST', '/api/v1/admin/settings/mail.contact/test', {
        query: { key: 'mail.contact' },
        body: { to: [' Ops@Ona.example '], cc: ['copia@ona.example'] }
      }) as never,
      res as never
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      key: 'mail.contact',
      sentTo: { to: ['ops@ona.example'], cc: ['copia@ona.example'] }
    });
    expect(settingsService.claimTestSendSlot).toHaveBeenCalledWith('mail.contact');
    expect(testMailer.sendTestEmail).toHaveBeenCalledWith('mail.contact', {
      to: ['ops@ona.example'],
      cc: ['copia@ona.example']
    });
  });

  it('returns 422 with the reason for an invalid test payload and does not send', async () => {
    const res = createMockRes();

    await adminMailSettingTestHandler(
      request('POST', '/api/v1/admin/settings/mail.contact/test', {
        query: { key: 'mail.contact' },
        body: { to: [], cc: [] }
      }) as never,
      res as never
    );

    expect(res.statusCode).toBe(422);
    expect((res.body as { error: string }).error).toMatch(/al menos un destinatario/i);
    expect(testMailer.sendTestEmail).not.toHaveBeenCalled();
  });

  it('releases the throttle slot when the provider rejects the test send', async () => {
    settingsService.claimTestSendSlot.mockResolvedValue(undefined);
    settingsService.releaseTestSendSlot.mockResolvedValue(undefined);
    testMailer.sendTestEmail.mockRejectedValue(new DomainError('No se pudo enviar', 502, 'MAILER_ERROR'));
    const res = createMockRes();

    await adminMailSettingTestHandler(
      request('POST', '/api/v1/admin/settings/mail.contact/test', {
        query: { key: 'mail.contact' },
        body: { to: ['a@b.co'] }
      }) as never,
      res as never
    );

    expect(res.statusCode).toBe(502);
    expect(settingsService.releaseTestSendSlot).toHaveBeenCalledWith('mail.contact');
  });

  it('surfaces the throttle as 429 and skips the send', async () => {
    settingsService.claimTestSendSlot.mockRejectedValue(new DomainError('throttled', 429, 'TEST_SEND_THROTTLED'));
    const res = createMockRes();

    await adminMailSettingTestHandler(
      request('POST', '/api/v1/admin/settings/mail.quote/test', {
        query: { key: 'mail.quote' },
        body: { to: ['a@b.co'] }
      }) as never,
      res as never
    );

    expect(res.statusCode).toBe(429);
    expect(testMailer.sendTestEmail).not.toHaveBeenCalled();
  });
});
