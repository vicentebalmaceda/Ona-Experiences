import type { BsaleClient as BsaleClientRecord, BsaleListResponse } from '../../types/bsale.js';
import type { Customer } from '../../types/sales.js';
import { createLogger } from '../../utils/logger.js';
import type { BsaleClient } from './client.js';

const log = createLogger('bsale-client');

function toBsaleClientPayload(customer: Customer): Record<string, unknown> {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    code: customer.rut ?? customer.email,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    municipality: customer.municipality,
    activity: customer.activity,
    companyOrPerson: customer.companyOrPerson ?? 0,
    ...(customer.isForeigner != null ? { isForeigner: customer.isForeigner } : {})
  };
}

export class BsaleClientRepository {
  constructor(private readonly client: BsaleClient) {}

  async upsertByEmail(customer: Customer): Promise<number> {
    log.debug('Upserting BSale client by email', { email: customer.email });

    const existing = await this.client.get<BsaleListResponse<BsaleClientRecord>>('/clients.json', {
      email: customer.email,
      limit: 1
    });

    const found = existing.items[0];
    if (found) {
      log.debug('Existing BSale client found', { clientId: found.id, email: customer.email });
      await this.client.put(`/clients/${found.id}.json`, toBsaleClientPayload(customer));
      return found.id;
    }

    const created = await this.client.post<BsaleClientRecord>(
      '/clients.json',
      toBsaleClientPayload(customer)
    );
    log.info('BSale client created', { clientId: created.id, email: customer.email });
    return created.id;
  }
}
