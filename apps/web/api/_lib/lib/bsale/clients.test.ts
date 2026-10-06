import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../types/sales.js';
import type { BsaleClient } from './client.js';
import { BsaleClientRepository, DEFAULT_CLIENT_ACTIVITY, toBsaleClientPayload } from './clients.js';

const chilean: Customer = {
  email: 'maria@example.com',
  firstName: 'María',
  lastName: 'González',
  documentType: 'rut',
  rut: '12345678-5'
};

const foreign: Customer = {
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  documentType: 'passport',
  passport: 'AB123456'
};

describe('toBsaleClientPayload', () => {
  it('sends the RUT as code with account defaults for a Chilean customer', () => {
    expect(toBsaleClientPayload(chilean)).toEqual({
      firstName: 'María',
      lastName: 'González',
      email: 'maria@example.com',
      code: '12345678-5',
      activity: DEFAULT_CLIENT_ACTIVITY,
      companyOrPerson: 0,
      isForeigner: 0
    });
  });

  it('normalizes a dotted RUT before sending it', () => {
    expect(toBsaleClientPayload({ ...chilean, rut: '12.345.605-k' }).code).toBe('12345605-K');
  });

  it('marks foreign guests and uses the passport as code when provided', () => {
    expect(toBsaleClientPayload(foreign)).toMatchObject({
      isForeigner: 1,
      code: 'AB123456'
    });
    expect(toBsaleClientPayload(foreign)).not.toHaveProperty('rut');
  });

  it('omits code for foreign guests without a passport so BSale assigns 55555555-5', () => {
    expect(toBsaleClientPayload({ ...foreign, passport: undefined })).not.toHaveProperty('code');
  });

  it('never falls back to the email as code', () => {
    expect(() => toBsaleClientPayload({ ...chilean, rut: undefined })).toThrow(/valid RUT/);
    expect(() => toBsaleClientPayload({ ...chilean, rut: 'maria@example.com' })).toThrow(/valid RUT/);
  });

  it('only includes optional contact fields when they have a value', () => {
    const payload = toBsaleClientPayload({ ...chilean, phone: '+56912345678', city: '' });
    expect(payload.phone).toBe('+56912345678');
    expect(payload).not.toHaveProperty('city');
    expect(payload).not.toHaveProperty('address');
  });

  it('keeps explicit activity and companyOrPerson overrides', () => {
    expect(
      toBsaleClientPayload({ ...chilean, activity: 'Turismo', companyOrPerson: 1 })
    ).toMatchObject({ activity: 'Turismo', companyOrPerson: 1 });
  });
});

function fakeClient(existing: Array<{ id: number }>) {
  return {
    get: vi.fn().mockResolvedValue({ items: existing, count: existing.length, limit: 1, offset: 0 }),
    post: vi.fn().mockResolvedValue({ id: 777 }),
    put: vi.fn().mockResolvedValue({ id: 42 })
  };
}

describe('BsaleClientRepository.upsertByEmail', () => {
  it('creates the client when the email is unknown', async () => {
    const client = fakeClient([]);
    const repo = new BsaleClientRepository(client as unknown as BsaleClient);

    await expect(repo.upsertByEmail(chilean)).resolves.toBe(777);

    expect(client.get).toHaveBeenCalledWith('/clients.json', { email: 'maria@example.com', limit: 1 });
    expect(client.post).toHaveBeenCalledWith('/clients.json', expect.objectContaining({ code: '12345678-5' }));
    expect(client.put).not.toHaveBeenCalled();
  });

  it('updates the existing client when the email is known', async () => {
    const client = fakeClient([{ id: 42 }]);
    const repo = new BsaleClientRepository(client as unknown as BsaleClient);

    await expect(repo.upsertByEmail(foreign)).resolves.toBe(42);

    expect(client.put).toHaveBeenCalledWith('/clients/42.json', expect.objectContaining({ isForeigner: 1 }));
    expect(client.post).not.toHaveBeenCalled();
  });

  it('fails before calling BSale when the customer has no usable identity', async () => {
    const client = fakeClient([]);
    const repo = new BsaleClientRepository(client as unknown as BsaleClient);

    await expect(repo.upsertByEmail({ ...chilean, rut: undefined })).rejects.toThrow(/valid RUT/);
    expect(client.get).not.toHaveBeenCalled();
  });
});
