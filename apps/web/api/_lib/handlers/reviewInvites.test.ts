import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRes } from '../test/mockRes.js';
import { reviewInvitesHandler } from './reviewInvites.js';

const createInvite = vi.fn();

vi.mock('../services/container.js', () => ({
  getServices: () => ({
    reviewService: { createInvite }
  })
}));

describe('POST /api/v1/review-invites', () => {
  beforeEach(() => {
    createInvite.mockReset();
    createInvite.mockResolvedValue({
      inviteId: 'inv-1',
      expiresAt: '2026-10-10T15:00:00.000Z'
    });
  });

  it('rejects missing admin credentials', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/v1/review-invites',
      body: {
        catalogType: 'lodge',
        bsaleProductId: 12,
        customer: { email: 'maria@example.com', firstName: 'María', lastName: 'González' }
      }
    };
    const res = createMockRes();

    await reviewInvitesHandler(req as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('creates an invite when the admin secret is valid', async () => {
    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        authorization: 'Bearer test-admin-secret-16'
      },
      url: '/api/v1/review-invites',
      body: {
        catalogType: 'lodge',
        bsaleProductId: 12,
        customer: { email: 'maria@example.com', firstName: 'María', lastName: 'González' }
      }
    };
    const res = createMockRes();

    await reviewInvitesHandler(req as never, res as never);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      inviteId: 'inv-1',
      expiresAt: '2026-10-10T15:00:00.000Z'
    });
    expect(createInvite).toHaveBeenCalledWith({
      catalogType: 'lodge',
      bsaleProductId: 12,
      customer: { email: 'maria@example.com', firstName: 'María', lastName: 'González' }
    });
  });
});
