import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../types/sales.js';
import type { BsaleClient } from './client.js';
import { BsaleApiError } from '../../types/errors.js';
import {
  BsaleClientRepository,
  DEFAULT_CLIENT_ACTIVITY,
  parseDuplicateClientId,
  toBsaleClientPayload,
  toBsaleClientUpdatePayload
} from './clients.js';

const postal = {
  address: 'Los Trigales 372',
  city: 'Las Condes',
  municipality: 'Las Condes',
  region: 'Región Metropolitana de Santiago'
};

const chilean: Customer = {
  email: 'maria@example.com',
  firstName: 'María',
  lastName: 'González',
  documentType: 'rut',
  rut: '12345678-5',
  ...postal
};

const foreign: Customer = {
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  documentType: 'passport',
  passport: 'AB123456',
  address: '1 Main St',
  city: 'Denver',
  municipality: 'Denver',
  region: 'United States'
};

describe('toBsaleClientPayload', () => {
  it('sends the RUT as code, the postal data and account defaults for a Chilean customer', () => {
    expect(toBsaleClientPayload(chilean)).toEqual({
      firstName: 'María',
      lastName: 'González',
      email: 'maria@example.com',
      code: '12345678-5',
      ...postal,
      activity: DEFAULT_CLIENT_ACTIVITY,
      companyOrPerson: 0,
      isForeigner: 0
    });
  });

  it('always sends the postal attributes the cotización document type requires', () => {
    for (const key of ['address', 'city', 'municipality', 'region'] as const) {
      expect(toBsaleClientPayload(chilean)).toHaveProperty(key, postal[key]);
      expect(toBsaleClientPayload(foreign)).toHaveProperty(key, foreign[key]);
    }
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

  it('only includes the phone when it has a value', () => {
    expect(toBsaleClientPayload({ ...chilean, phone: '+56912345678' }).phone).toBe('+56912345678');
    expect(toBsaleClientPayload({ ...chilean, phone: '' })).not.toHaveProperty('phone');
    expect(toBsaleClientPayload(chilean)).not.toHaveProperty('phone');
  });

  it('keeps explicit activity and companyOrPerson overrides', () => {
    expect(
      toBsaleClientPayload({ ...chilean, activity: 'Turismo', companyOrPerson: 1 })
    ).toMatchObject({ activity: 'Turismo', companyOrPerson: 1 });
  });
});

const DUPLICATE_MESSAGE = 'this client code already exists: 9000008-K. Client id: 4321';

function fakeClient(existing: Array<{ id: number }>) {
  return {
    get: vi.fn().mockResolvedValue({ items: existing, count: existing.length, limit: 1, offset: 0 }),
    post: vi.fn().mockResolvedValue({ id: 777 }),
    put: vi.fn().mockResolvedValue({ id: 42 })
  };
}

function repoFor(client: ReturnType<typeof fakeClient>) {
  return new BsaleClientRepository(client as unknown as BsaleClient);
}

const PROTECTED_FIELDS = ['code', 'activity', 'companyOrPerson', 'isForeigner'] as const;

describe('toBsaleClientUpdatePayload', () => {
  it('only carries contact and postal fields', () => {
    expect(toBsaleClientUpdatePayload({ ...chilean, phone: '+56912345678' })).toEqual({
      firstName: 'María',
      lastName: 'González',
      email: 'maria@example.com',
      phone: '+56912345678',
      ...postal
    });
  });

  it('omits empty values so they do not wipe stored data', () => {
    const update = toBsaleClientUpdatePayload({ ...chilean, phone: '', lastName: '  ' });
    expect(update).not.toHaveProperty('phone');
    expect(update).not.toHaveProperty('lastName');
  });
});

describe('parseDuplicateClientId', () => {
  it('reads the client id from the BSale message', () => {
    expect(parseDuplicateClientId(new BsaleApiError(DUPLICATE_MESSAGE, 400))).toBe(4321);
  });

  it('reads the client id from the raw body when the message is generic', () => {
    const error = new BsaleApiError('BSale API error: 400', 400, { error: [DUPLICATE_MESSAGE] });
    expect(parseDuplicateClientId(error)).toBe(4321);
  });

  it('ignores unrelated errors', () => {
    expect(parseDuplicateClientId(new BsaleApiError('invalid rut', 400))).toBeNull();
    expect(parseDuplicateClientId(new Error(DUPLICATE_MESSAGE))).toBeNull();
  });
});

describe('BsaleClientRepository.upsert', () => {
  it('finds a Chilean customer by RUT among active clients and updates it', async () => {
    const client = fakeClient([{ id: 42 }]);

    await expect(repoFor(client).upsert(chilean)).resolves.toBe(42);

    expect(client.get).toHaveBeenCalledWith('/clients.json', {
      code: '12345678-5',
      state: 0,
      limit: 1
    });
    expect(client.put).toHaveBeenCalledWith('/clients/42.json', {
      firstName: 'María',
      lastName: 'González',
      email: 'maria@example.com',
      ...postal
    });
    expect(client.post).not.toHaveBeenCalled();
  });

  it('looks up by the formatted RUT', async () => {
    const client = fakeClient([{ id: 4321 }]);

    await repoFor(client).upsert({ ...chilean, rut: '9.000.008-k' });

    expect(client.get).toHaveBeenCalledWith('/clients.json', expect.objectContaining({ code: '9000008-K' }));
  });

  it('never rewrites code, activity, companyOrPerson or isForeigner on an existing client', async () => {
    const client = fakeClient([{ id: 42 }]);

    await repoFor(client).upsert({ ...chilean, activity: 'Turismo', companyOrPerson: 1 });

    const body = client.put.mock.calls[0][1];
    for (const key of PROTECTED_FIELDS) expect(body).not.toHaveProperty(key);
    expect(body).toMatchObject(postal);
  });

  it('creates the client with the full payload when the RUT is unknown', async () => {
    const client = fakeClient([]);

    await expect(repoFor(client).upsert(chilean)).resolves.toBe(777);

    expect(client.get).toHaveBeenCalledWith('/clients.json', {
      code: '12345678-5',
      state: 0,
      limit: 1
    });
    expect(client.post).toHaveBeenCalledWith('/clients.json', toBsaleClientPayload(chilean));
    expect(client.put).not.toHaveBeenCalled();
  });

  it('looks up a foreigner with passport by the passport code', async () => {
    const client = fakeClient([{ id: 42 }]);

    await expect(repoFor(client).upsert(foreign)).resolves.toBe(42);

    expect(client.get).toHaveBeenCalledWith('/clients.json', { code: 'AB123456', state: 0, limit: 1 });
    expect(client.put.mock.calls[0][1]).not.toHaveProperty('isForeigner');
  });

  it('looks up a foreigner without passport by email, never by the generic code', async () => {
    const client = fakeClient([{ id: 42 }]);

    await expect(repoFor(client).upsert({ ...foreign, passport: undefined })).resolves.toBe(42);

    expect(client.get).toHaveBeenCalledWith('/clients.json', {
      email: 'john@example.com',
      state: 0,
      limit: 1
    });
    expect(client.get).not.toHaveBeenCalledWith('/clients.json', expect.objectContaining({ code: expect.anything() }));
  });

  it('creates a foreigner without passport when the email is unknown', async () => {
    const client = fakeClient([]);
    const customer = { ...foreign, passport: undefined };

    await expect(repoFor(client).upsert(customer)).resolves.toBe(777);

    expect(client.post.mock.calls[0][1]).not.toHaveProperty('code');
  });

  it('reuses the existing client when BSale reports the code already exists', async () => {
    const client = fakeClient([]);
    client.post.mockRejectedValue(new BsaleApiError(DUPLICATE_MESSAGE, 400, { error: DUPLICATE_MESSAGE }));

    await expect(repoFor(client).upsert({ ...chilean, rut: '9000008-K' })).resolves.toBe(4321);

    expect(client.put).toHaveBeenCalledTimes(1);
    const [path, body] = client.put.mock.calls[0];
    expect(path).toBe('/clients/4321.json');
    for (const key of PROTECTED_FIELDS) expect(body).not.toHaveProperty(key);
    expect(body).toMatchObject(postal);
  });

  it('rethrows other creation errors', async () => {
    const client = fakeClient([]);
    const error = new BsaleApiError('invalid rut', 400);
    client.post.mockRejectedValue(error);

    await expect(repoFor(client).upsert(chilean)).rejects.toBe(error);
    expect(client.put).not.toHaveBeenCalled();
  });

  it('fails before calling BSale when the customer has no usable identity', async () => {
    const client = fakeClient([]);

    await expect(repoFor(client).upsert({ ...chilean, rut: undefined })).rejects.toThrow(/valid RUT/);
    expect(client.get).not.toHaveBeenCalled();
  });
});
