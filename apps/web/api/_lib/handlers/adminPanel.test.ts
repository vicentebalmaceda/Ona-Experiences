import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminSessionToken } from '../auth/adminSession.js';
import { resetEnvForTests } from '../config/env.js';
import { createMockRes } from '../test/mockRes.js';
import { adminLoginHandler } from './adminAuth.js';
import { adminQuoteSendInviteHandler } from './adminPanel.js';

const sendInvite = vi.fn();

vi.mock('../services/container.js', () => ({
  getServices: () => ({
    adminService: { sendInvite }
  })
}));

describe('admin auth + send invite', () => {
  beforeEach(() => {
    resetEnvForTests();
    sendInvite.mockReset();
    sendInvite.mockResolvedValue({
      inviteId: 'inv-1',
      expiresAt: '2026-10-10T15:00:00.000Z'
    });
  });

  it('rejects send without a session cookie', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/v1/admin/quotes/6634/invite',
      query: { bsaleDocumentId: '6634' },
      body: {}
    };
    const res = createMockRes();

    await adminQuoteSendInviteHandler(req as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(sendInvite).not.toHaveBeenCalled();
  });

  it('logs in and sends an invite with the session cookie', async () => {
    const loginReq = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/v1/admin/login',
      body: { email: 'admin@ona.example', password: 'test-admin-password' }
    };
    const loginRes = createMockRes();
    await adminLoginHandler(loginReq as never, loginRes as never);
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.headers['Set-Cookie']).toContain('ona_admin_session=');

    const { token } = createAdminSessionToken(
      'admin@ona.example',
      process.env.ADMIN_SESSION_SECRET!
    );
    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        cookie: `ona_admin_session=${encodeURIComponent(token)}`
      },
      url: '/api/v1/admin/quotes/6634/invite',
      query: { bsaleDocumentId: '6634' },
      body: { adminNote: 'post-stay' }
    };
    const res = createMockRes();
    await adminQuoteSendInviteHandler(req as never, res as never);

    expect(res.statusCode).toBe(201);
    expect(sendInvite).toHaveBeenCalledWith(6634, 'post-stay');
  });
});
