import { describe, expect, it } from 'vitest';
import { customerSchema, saleRequestSchema } from './schemas.js';

const postal = {
  address: 'Los Trigales 372',
  city: 'Las Condes',
  municipality: 'Las Condes',
  region: 'Región Metropolitana de Santiago'
};
const base = { email: 'maria@example.com', firstName: 'María', lastName: 'González', ...postal };

describe('customerSchema', () => {
  it('defaults to a Chilean RUT and normalizes it', () => {
    expect(customerSchema.parse({ ...base, rut: '12.345.678-5' })).toMatchObject({
      documentType: 'rut',
      rut: '12345678-5'
    });
  });

  it('rejects a missing RUT when the document type is rut', () => {
    const result = customerSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ path: ['rut'], message: 'RUT is required' });
    }
  });

  it('rejects an invalid RUT', () => {
    const result = customerSchema.safeParse({ ...base, rut: '12.345.678-9' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ path: ['rut'], message: 'Invalid RUT' });
    }
  });

  it('accepts a foreign guest without a RUT and flags isForeigner', () => {
    expect(customerSchema.parse({ ...base, documentType: 'passport', passport: ' AB123 ' })).toMatchObject({
      documentType: 'passport',
      passport: 'AB123',
      isForeigner: 1,
      rut: undefined
    });
  });

  it('accepts a foreign guest with no passport number', () => {
    const parsed = customerSchema.parse({ ...base, documentType: 'passport' });
    expect(parsed.isForeigner).toBe(1);
    expect(parsed.passport).toBeUndefined();
    expect(parsed.rut).toBeUndefined();
  });

  it('drops a blank phone', () => {
    const parsed = customerSchema.parse({ ...base, rut: '12345678-5', phone: '  ' });
    expect(parsed.phone).toBeUndefined();
  });

  it('requires address, city, municipality and region (BSale cli_004)', () => {
    for (const key of ['address', 'city', 'municipality', 'region'] as const) {
      const missing = customerSchema.safeParse({ ...base, rut: '12345678-5', [key]: '  ' });
      expect(missing.success).toBe(false);
      if (!missing.success) {
        expect(missing.error.issues.map((issue) => issue.path[0])).toContain(key);
      }
    }
  });

  it('trims the postal fields', () => {
    const parsed = customerSchema.parse({ ...base, rut: '12345678-5', municipality: '  Pucón ' });
    expect(parsed.municipality).toBe('Pucón');
  });
});

describe('saleRequestSchema', () => {
  it('parses a full quote request with the new customer fields', () => {
    const parsed = saleRequestSchema.parse({
      customer: { ...base, rut: '12.345.678-5', phone: '+56 9 1234 5678' },
      reservationDate: '2026-11-01',
      reservationEndDate: '2026-11-03',
      notes: 'Dos personas, pesca con mosca.'
    });
    expect(parsed.customer).toMatchObject({ rut: '12345678-5', phone: '+56 9 1234 5678' });
    expect(parsed.quantity).toBe(1);
  });
});
