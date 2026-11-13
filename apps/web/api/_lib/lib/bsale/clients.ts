import type { BsaleClient as BsaleClientRecord, BsaleListResponse } from '../../types/bsale.js';
import { BsaleApiError } from '../../types/errors.js';
import type { Customer } from '../../types/sales.js';
import { createLogger } from '../../utils/logger.js';
import { formatRutForBsale } from '../../utils/rut.js';
import type { BsaleClient } from './client.js';

const log = createLogger('bsale-client');

/** Account convention: every person client in this BSale account carries this giro. */
export const DEFAULT_CLIENT_ACTIVITY = 'Sin Giro';

/**
 * Generic RUT BSale assigns to foreign clients without a passport number. Many
 * unrelated people share it, so it must never be used to identify a client.
 */
export const GENERIC_FOREIGNER_CODE = '55555555-5';

/**
 * Fields refreshed from the quote form on an already existing BSale client.
 * `code`, `activity`, `companyOrPerson` and `isForeigner` are deliberately
 * absent: they describe the client's tax identity, which the back office owns
 * and a website form must not rewrite.
 */
const UPDATABLE_CLIENT_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'city',
  'municipality',
  'region'
] as const;

/**
 * Maps a Customer to the BSale `/clients.json` body.
 *
 * - `code` is only ever a validated RUT (`12345678-9`). The email is never
 *   used as `code`: BSale accepts it on POST but the client then has an
 *   invalid RUT and cannot be used on documents.
 * - Foreign guests get `isForeigner: 1`; BSale assigns the generic RUT
 *   55555555-5 unless a passport number is provided, which goes in `code`
 *   (https://docs.bsale.dev/clientes, "cliente extranjero").
 * - `address`, `city`, `municipality` and `region` are always sent: the
 *   cotización document type requires them on the client (BSale error
 *   cli_004: "This document type has the following client attributes
 *   required: city, municipality/district, address, region").
 * - `activity` and `companyOrPerson` get account defaults so the visitor is
 *   not asked for them. Empty optional fields (phone) are omitted rather than
 *   sent as blanks so a PUT does not wipe data already stored in BSale.
 */
export function toBsaleClientPayload(customer: Customer): Record<string, unknown> {
  const isForeigner = customer.documentType === 'passport' || customer.isForeigner === 1;
  const rut = !isForeigner && customer.rut ? formatRutForBsale(customer.rut) : null;

  if (!isForeigner && !rut) {
    throw new Error('Customer must provide a valid RUT or be marked as foreigner');
  }

  const payload: Record<string, unknown> = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    address: customer.address,
    city: customer.city,
    municipality: customer.municipality,
    region: customer.region,
    activity: customer.activity ?? DEFAULT_CLIENT_ACTIVITY,
    companyOrPerson: customer.companyOrPerson ?? 0,
    isForeigner: isForeigner ? 1 : 0
  };

  if (isForeigner) {
    if (customer.passport) payload.code = customer.passport;
  } else {
    payload.code = rut;
  }

  if (customer.phone) payload.phone = customer.phone;

  return payload;
}

/**
 * Body for `PUT /clients/{id}.json` on a client that already exists in BSale.
 *
 * Only contact and postal fields are sent. The postal ones matter: the
 * cotización document type rejects clients missing address/city/municipality/
 * region (cli_004), and older clients created from the back office often lack
 * them. Empty values are omitted so they never wipe data stored in BSale.
 *
 * Name and email ARE refreshed: the quote notification email is sent to the
 * email stored on the BSale client (read back by the document webhook), so a
 * stale or missing email would send the visitor's quote to the wrong inbox or
 * nowhere. The RUT stays the identity key; name/email are just the latest
 * contact details the person gave us.
 */
export function toBsaleClientUpdatePayload(customer: Customer): Record<string, unknown> {
  const full = toBsaleClientPayload(customer);
  const update: Record<string, unknown> = {};
  for (const key of UPDATABLE_CLIENT_FIELDS) {
    const value = full[key];
    if (typeof value === 'string' ? value.trim() !== '' : value != null) {
      update[key] = value;
    }
  }
  return update;
}

/**
 * BSale rejects a POST whose `code` is already taken with a message like
 * "this client code already exists: 9000008-K. Client id: 4321". The message
 * may arrive as `BsaleApiError.message` (extracted from `error`/`message`) or
 * only inside the raw body, so both are searched. Returns the existing id.
 */
export function parseDuplicateClientId(error: unknown): number | null {
  if (!(error instanceof BsaleApiError)) return null;
  const haystacks = [error.message];
  if (error.body !== undefined) {
    haystacks.push(typeof error.body === 'string' ? error.body : JSON.stringify(error.body));
  }
  for (const text of haystacks) {
    if (!/code already exists/i.test(text)) continue;
    const match = /client\s*id\s*:?\s*(\d+)/i.exec(text);
    if (match) return Number(match[1]);
  }
  return null;
}

export class BsaleClientRepository {
  constructor(private readonly client: BsaleClient) {}

  async getById(clientId: number | string): Promise<BsaleClientRecord> {
    return this.client.get<BsaleClientRecord>(`/clients/${clientId}.json`);
  }

  /**
   * Finds the visitor's BSale client (creating it when missing) and returns
   * its id for the cotización.
   *
   * Lookup key, active clients only (`state: 0`):
   * - RUT or passport (`code`) when present — BSale enforces unique codes,
   *   so this is the real identity. Looking up by email missed clients loaded
   *   from the back office with another/no email, and the POST then failed
   *   with "this client code already exists".
   * - email for foreigners without passport: their code would be the shared
   *   generic 55555555-5, which identifies nobody.
   *
   * Existing clients only get contact/postal fields (see
   * `toBsaleClientUpdatePayload`); new clients get the full payload.
   */
  async upsert(customer: Customer): Promise<number> {
    const payload = toBsaleClientPayload(customer);
    const code = typeof payload.code === 'string' ? payload.code : undefined;
    const lookupByCode = code !== undefined && code !== GENERIC_FOREIGNER_CODE;

    log.debug('Upserting BSale client', {
      lookup: lookupByCode ? 'code' : 'email',
      code,
      email: customer.email
    });

    const existing = await this.client.get<BsaleListResponse<BsaleClientRecord>>(
      '/clients.json',
      lookupByCode
        ? { code, state: 0, limit: 1 }
        : { email: customer.email, state: 0, limit: 1 }
    );

    const found = existing.items[0];
    if (found) {
      log.debug('Existing BSale client found', { clientId: found.id, code, email: customer.email });
      return this.updateExisting(found.id, customer);
    }

    try {
      const created = await this.client.post<BsaleClientRecord>('/clients.json', payload);
      log.info('BSale client created', { clientId: created.id, code, email: customer.email });
      return created.id;
    } catch (error) {
      // Safety net: the code exists but the lookup missed it (e.g. the client
      // is inactive, or BSale normalized the code differently). BSale tells us
      // the existing id, so reuse that client instead of failing the quote.
      const duplicateId = lookupByCode ? parseDuplicateClientId(error) : null;
      if (duplicateId === null) throw error;
      log.warn('BSale client code already exists; reusing existing client', {
        clientId: duplicateId,
        code
      });
      return this.updateExisting(duplicateId, customer);
    }
  }

  private async updateExisting(clientId: number, customer: Customer): Promise<number> {
    await this.client.put(`/clients/${clientId}.json`, toBsaleClientUpdatePayload(customer));
    return clientId;
  }
}
