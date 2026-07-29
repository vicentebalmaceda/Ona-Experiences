import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '../types/errors.js';
import { ResendMailer } from './resendMailer.js';
import type { ContactMessage, QuoteNotification } from './types.js';
import {
  contactEmailSubject,
  contactEmailText
} from './templates/contactEmail.js';
import { quoteEmailSubject, quoteEmailText } from './templates/quoteEmail.js';

const env = {
  RESEND_API_KEY: 're_test',
  MAIL_FROM: 'Website <noreply@ona.example>',
  ADMIN_EMAIL: 'admin@ona.example'
} as ConstructorParameters<typeof ResendMailer>[0];

const contact: ContactMessage = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  subject: 'Consulta lodge',
  message: 'Hola, quiero información.'
};

const quote: QuoteNotification = {
  documentId: 42,
  documentNumber: 1001,
  salesId: 'ONA-LODGE-abc',
  emissionDate: 1717200000,
  totalAmount: 119000,
  netAmount: 100000,
  taxAmount: 19000,
  urlPdf: 'https://example.com/doc.pdf',
  customer: {
    firstName: 'Juan',
    lastName: 'Soto',
    email: 'juan@example.com',
    phone: '+56911111111',
    code: '1-9'
  },
  items: [
    {
      description: 'Estadía lodge',
      quantity: 2,
      netUnitValue: 50000,
      totalAmount: 100000,
      note: 'Cotización para Estadía lodge\n Reserva: 2026-07-01 al 2026-07-04.\n Detalles:grupo de 4'
    }
  ]
};

describe('email templates', () => {
  it('builds contact subject and body with reply fields', () => {
    expect(contactEmailSubject(contact)).toBe('Contact form: Ana Pérez');
    const text = contactEmailText(contact);
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('ana@example.com');
    expect(text).toContain('Consulta lodge');
    expect(text).toContain('Hola, quiero información.');
  });

  it('builds quote notification with available quote fields', () => {
    expect(quoteEmailSubject(quote)).toContain('#1001');
    expect(quoteEmailSubject(quote)).toContain('Estadía lodge');
    const text = quoteEmailText(quote);
    expect(text).toContain('Document ID: 42');
    expect(text).toContain('Estadía lodge');
    expect(text).toContain('119000');
    expect(text).toContain('juan@example.com');
    expect(text).toContain('Detalles:grupo de 4');
  });
});

describe('ResendMailer', () => {
  it('sends contact email with Reply-To and verified From', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const mailer = new ResendMailer(env, { emails: { send } } as never);

    await mailer.sendContactMessage(contact);

    expect(send).toHaveBeenCalledTimes(1);
    const [payload] = send.mock.calls[0];
    expect(payload.from).toBe(env.MAIL_FROM);
    expect(payload.from).not.toBe(contact.email);
    expect(payload.to).toEqual([env.ADMIN_EMAIL]);
    expect(payload.replyTo).toBe(contact.email);
    expect(payload.subject).toBe('Contact form: Ana Pérez');
  });

  it('sends quote notification with idempotency key', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'msg_2' }, error: null });
    const mailer = new ResendMailer(env, { emails: { send } } as never);

    await mailer.sendQuoteNotification(quote);

    expect(send).toHaveBeenCalledTimes(1);
    const [payload, options] = send.mock.calls[0];
    expect(payload.from).toBe(env.MAIL_FROM);
    expect(payload.to).toEqual([env.ADMIN_EMAIL]);
    expect(options).toEqual({ idempotencyKey: 'quote-notification:v2:42' });
  });

  it('propagates Resend failures as DomainError', async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'rate limited', name: 'rate_limit_exceeded' }
    });
    const mailer = new ResendMailer(env, { emails: { send } } as never);

    await expect(mailer.sendContactMessage(contact)).rejects.toBeInstanceOf(DomainError);
    await expect(mailer.sendQuoteNotification(quote)).rejects.toMatchObject({
      code: 'MAILER_ERROR',
      statusCode: 500
    });
  });
});
