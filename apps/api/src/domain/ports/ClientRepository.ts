import type { Customer } from '../entities/Customer.js';

export interface ClientRepository {
  upsertByEmail(customer: Customer): Promise<number>;
}
