import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactRequestSchema } from '../_lib/types/schemas.js';
import { DomainError } from '../_lib/types/errors.js';
import { createMockRes } from '../_lib/test/mockRes.js';

const sendContactMessage = vi.fn();

vi.mock('../_lib/services/container.js', () => ({
  getServices: () => ({
    mailer: { sendContactMessage }
  })
}));

describe('contactRequestSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = contactRequestSchema.parse({
      name: 'Ana',
      email: 'ana@example.com',
      subject: 'Hola',
      message: 'Quiero información sobre lodges.'
    });
    expect(parsed.email).toBe('ana@example.com');
  });

  it('rejects invalid email and oversized message', () => {
    expect(() =>
      contactRequestSchema.parse({
        name: 'Ana',
        email: 'not-an-email',
        subject: 'Hola',
        message: 'ok'
      })
    ).toThrow();

    expect(() =>
      contactRequestSchema.parse({
        name: 'Ana',
        email: 'ana@example.com',
        subject: 'Hola',
        message: 'x'.repeat(5001)
      })
    ).toThrow();
  });
});

describe('POST /api/v1/contact handler', () => {
  beforeEach(() => {
    sendContactMessage.mockReset();
    sendContactMessage.mockResolvedValue(undefined);
  });

  it('accepts a valid request and calls the mailer', async () => {
    const { default: handler } = await import('./contact.js');
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/v1/contact',
      body: {
        name: 'Ana',
        email: 'ana@example.com',
        subject: 'Consulta',
        message: 'Mensaje de prueba suficientemente largo.'
      }
    };
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sendContactMessage).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      subject: 'Consulta',
      message: 'Mensaje de prueba suficientemente largo.'
    });
  });

  it('rejects invalid input with 400', async () => {
    const { default: handler } = await import('./contact.js');
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/v1/contact',
      body: { name: '', email: 'bad', subject: '', message: '' }
    };
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('returns failure when the mailer fails', async () => {
    sendContactMessage.mockRejectedValue(
      new DomainError('Failed to send contact email', 500, 'MAILER_ERROR')
    );
    const { default: handler } = await import('./contact.js');
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      url: '/api/v1/contact',
      body: {
        name: 'Ana',
        email: 'ana@example.com',
        subject: 'Consulta',
        message: 'Mensaje de prueba suficientemente largo.'
      }
    };
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ code: 'MAILER_ERROR' });
  });
});
