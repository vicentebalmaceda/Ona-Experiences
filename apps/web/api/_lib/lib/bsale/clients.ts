import type { BsaleClient as BsaleClientRecord, BsaleListResponse } from '../../types/bsale.js';
import type { Customer } from '../../types/sales.js';
import { createLogger } from '../../utils/logger.js';
import { formatRutForBsale } from '../../utils/rut.js';
import type { BsaleClient } from './client.js';

const log = createLogger('bsale-client');

/** Account convention: every person client in this BSale account carries this giro. */
export const DEFAULT_CLIENT_ACTIVITY = 'Sin Giro';

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

export class BsaleClientRepository {
  constructor(private readonly client: BsaleClient) {}

  async getById(clientId: number | string): Promise<BsaleClientRecord> {
    return this.client.get<BsaleClientRecord>(`/clients/${clientId}.json`);
  }

  async upsertByEmail(customer: Customer): Promise<number> {
    log.debug('Upserting BSale client by email', { email: customer.email });
    const payload = toBsaleClientPayload(customer);

    const existing = await this.client.get<BsaleListResponse<BsaleClientRecord>>('/clients.json', {
      email: customer.email,
      limit: 1
    });

    const found = existing.items[0];
    if (found) {
      log.debug('Existing BSale client found', { clientId: found.id, email: customer.email });
      await this.client.put(`/clients/${found.id}.json`, payload);
      return found.id;
    }

    const created = await this.client.post<BsaleClientRecord>('/clients.json', payload);
    log.info('BSale client created', { clientId: created.id, email: customer.email });
    return created.id;
  }
}
