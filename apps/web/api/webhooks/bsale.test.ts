import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '../_lib/types/errors.js';
import { createMockRes } from '../_lib/test/mockRes.js';

const dispatch = vi.fn();

vi.mock('../_lib/services/webhookService.js', async () => {
  const actual = await vi.importActual<typeof import('../_lib/services/webhookService.js')>(
    '../_lib/services/webhookService.js'
  );
  return {
    ...actual,
    WebhookService: class {
      dispatch = dispatch;
    }
  };
});

const sampleBody = {
  cpnId: 2,
  resource: '/documents/14417.json',
  resourceId: '14417',
  topic: 'document',
  action: 'post',
  officeId: '2'
};

describe('POST /api/webhooks/bsale', () => {
  beforeEach(() => {
    dispatch.mockReset();
    dispatch.mockResolvedValue({ handled: true, detail: 'quote notification sent' });
  });

  it('accepts an open webhook with the BSale document payload', async () => {
    const { default: handler } = await import('../webhooks/bsale.js');
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/webhooks/bsale',
      query: {},
      body: sampleBody
    };
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ received: true, topic: 'document', handled: true });
    expect(dispatch).toHaveBeenCalledWith(sampleBody);
  });

  it('rejects malformed payloads', async () => {
    const { default: handler } = await import('../webhooks/bsale.js');
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/webhooks/bsale',
      query: {},
      body: { cpnId: 2 }
    };
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns failure when dispatch throws mailer errors', async () => {
    dispatch.mockRejectedValue(
      new DomainError('Failed to send quote notification', 500, 'MAILER_ERROR')
    );
    const { default: handler } = await import('../webhooks/bsale.js');
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/webhooks/bsale',
      query: {},
      body: sampleBody
    };
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
  });
});
