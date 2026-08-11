import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '../types/errors.js';
import { ResendMailer } from './resendMailer.js';
import {
  contactEmailSubject,
  contactTemplateVariables,
  formatItemsSummary,
  QUOTE_TEMPLATE_VARIABLE_KEYS,
  quoteEmailSubject,
  quoteTemplateVariables,
  truncateResendValue
} from './templateVariables.js';
import type { ContactMessage, QuoteNotification } from './types.js';

const env = {
  RESEND_API_KEY: 're_test',
  MAIL_FROM: 'Website <noreply@ona.example>',
  ADMIN_EMAIL: 'admin@ona.example',
  RESEND_CONTACT_TEMPLATE_ID: 'contact-form',
  RESEND_QUOTE_TEMPLATE_ID: 'quote-notification'
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

describe('templateVariables', () => {
  it('maps contact fields and truncates long messages', () => {
    expect(contactEmailSubject(contact)).toBe('Consulta lodge');
    expect(contactTemplateVariables(contact)).toEqual({
      CONTACT_NAME: 'Ana Pérez',
      CONTACT_EMAIL: 'ana@example.com',
      CONTACT_SUBJECT: 'Consulta lodge',
      CONTACT_MESSAGE: 'Hola, quiero información.'
    });

    const long = 'x'.repeat(2100);
    expect(truncateResendValue(long)).toHaveLength(2000);
    expect(contactTemplateVariables({ ...contact, message: long }).CONTACT_MESSAGE).toHaveLength(2000);
  });

  it('maps quote fields into flat Resend variables matching quote-notification', () => {
    expect(quoteEmailSubject(quote)).toContain('#1001');
    expect(quoteEmailSubject(quote)).toContain('Estadía lodge');

    const variables = quoteTemplateVariables(quote);
    expect(Object.keys(variables).sort()).toEqual([...QUOTE_TEMPLATE_VARIABLE_KEYS].sort());
    expect(variables).toEqual({
      DOCUMENT_ID: '42',
      DOCUMENT_NUMBER: '1001',
      SALES_ID: 'ONA-LODGE-abc',
      EMISSION_DATE: '2024-06-01',
      CUSTOMER_NAME: 'Juan Soto',
      CUSTOMER_EMAIL: 'juan@example.com',
      CUSTOMER_PHONE: '+56911111111',
      CUSTOMER_CODE: '1-9',
      URL_PUBLIC_VIEW: '',
      URL_PDF: 'https://example.com/doc.pdf',
      ITEMS_SUMMARY: formatItemsSummary(quote)
    });
    expect(variables.ITEMS_SUMMARY).toContain('Estadía lodge');
    expect(variables.ITEMS_SUMMARY).toContain('cantidad: 2');
    expect(variables.ITEMS_SUMMARY).toContain('Detalles:grupo de 4');
    expect(variables.ITEMS_SUMMARY).not.toMatch(/neto|total|50000|100000|119000/i);
    expect(formatItemsSummary({ ...quote, items: [] })).toBe('(sin detalle de ítems)');
  });

  it('sends empty strings for optional quote fields missing from BSale', () => {
    const variables = quoteTemplateVariables({
      documentId: 7,
      customer: { firstName: 'Solo' }
    });
    expect(variables).toEqual({
      DOCUMENT_ID: '7',
      DOCUMENT_NUMBER: '',
      SALES_ID: '',
      EMISSION_DATE: '',
      CUSTOMER_NAME: 'Solo',
      CUSTOMER_EMAIL: '',
      CUSTOMER_PHONE: '',
      CUSTOMER_CODE: '',
      URL_PUBLIC_VIEW: '',
      URL_PDF: '',
      ITEMS_SUMMARY: '(sin detalle de ítems)'
    });
  });
});

describe('ResendMailer', () => {
  it('sends contact email via hosted template with Reply-To', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const mailer = new ResendMailer(env, { emails: { send } } as never);

    await mailer.sendContactMessage(contact);

    expect(send).toHaveBeenCalledTimes(1);
    const [payload] = send.mock.calls[0];
    expect(payload.from).toBe(env.MAIL_FROM);
    expect(payload.from).not.toBe(contact.email);
    expect(payload.to).toEqual([env.ADMIN_EMAIL]);
    expect(payload.replyTo).toBe(contact.email);
    expect(payload.subject).toBe('Consulta lodge');
    expect(payload.html).toBeUndefined();
    expect(payload.text).toBeUndefined();
    expect(payload.template).toEqual({
      id: 'contact-form',
      variables: contactTemplateVariables(contact)
    });
  });

  it('sends quote notification via hosted template with idempotency key', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'msg_2' }, error: null });
    const mailer = new ResendMailer(env, { emails: { send } } as never);

    await mailer.sendQuoteNotification(quote);

    expect(send).toHaveBeenCalledTimes(1);
    const [payload, options] = send.mock.calls[0];
    expect(payload.from).toBe(env.MAIL_FROM);
    expect(payload.to).toEqual([env.ADMIN_EMAIL]);
    expect(payload.replyTo).toBe('juan@example.com');
    expect(payload.html).toBeUndefined();
    expect(payload.text).toBeUndefined();
    expect(payload.template).toEqual({
      id: 'quote-notification',
      variables: quoteTemplateVariables(quote)
    });
    expect(options).toEqual({ idempotencyKey: 'quote-notification:v6:42' });
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
