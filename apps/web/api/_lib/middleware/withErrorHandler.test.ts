import { describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { createMockRes } from '../test/mockRes.js';
import { BsaleApiError } from '../types/errors.js';
import { withErrorHandler } from './withErrorHandler.js';

const req = { url: '/api/v1/lodges/1/sales' } as VercelRequest;

async function run(error: unknown) {
  const res = createMockRes();
  await withErrorHandler(async () => {
    throw error;
  })(req, res as never);
  return res;
}

describe('withErrorHandler with BsaleApiError', () => {
  it('surfaces a BSale 400 rejection as 422 with the BSale message', async () => {
    const res = await run(new BsaleApiError('El rut del cliente no es válido', 400, { error: '…' }));
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      error: 'El rut del cliente no es válido',
      code: 'BSALE_REJECTED',
      bsaleStatus: 400
    });
  });

  it('keeps 401 as invalid credentials', async () => {
    const res = await run(new BsaleApiError('unauthorized', 401));
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Invalid BSale credentials' });
  });

  it('keeps 5xx as 502 unavailable', async () => {
    const res = await run(new BsaleApiError('boom', 503));
    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: 'BSale API unavailable', message: 'boom' });
  });
});
