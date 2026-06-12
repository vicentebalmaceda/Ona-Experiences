import type { Customer } from '../../domain/entities/Customer.js';
import type { ClientRepository } from '../../domain/ports/ClientRepository.js';
import { createLogger } from '../../shared/logger.js';
import { BsaleHttpClient, type BsaleListResponse } from './BsaleHttpClient.js';
import type { BsaleClient } from './types.js';

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

export class BsaleClientRepository implements ClientRepository {
  constructor(private readonly client: BsaleHttpClient) {}

  async upsertByEmail(customer: Customer): Promise<number> {
    log.debug('Upserting BSale client by email', { email: customer.email });

    const existing = await this.client.get<BsaleListResponse<BsaleClient>>('/clients.json', {
      email: customer.email,
      limit: 1
    });

    const found = existing.items[0];
    if (found) {
      log.debug('Existing BSale client found', { clientId: found.id, email: customer.email });
      await this.client.put(`/clients/${found.id}.json`, toBsaleClientPayload(customer));
      return found.id;
    }

    const created = await this.client.post<BsaleClient>('/clients.json', toBsaleClientPayload(customer));
    log.info('BSale client created', { clientId: created.id, email: customer.email });
    return created.id;
  }
}
