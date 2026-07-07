import { randomUUID } from 'node:crypto';
import type { Customer } from '../../domain/entities/Customer.js';
import type { QuoteSale } from '../../domain/entities/QuoteSale.js';
import type { CatalogRepository } from '../../domain/ports/CatalogRepository.js';
import type { ClientRepository } from '../../domain/ports/ClientRepository.js';
import type { SalesRepository } from '../../domain/ports/SalesRepository.js';
import type { VariantPricingRepository } from '../../domain/ports/VariantPricingRepository.js';

export interface CreateQuoteSaleParams {
  productId: number;
  type: 'lodge' | 'guide';
  customer: Customer;
  quantity?: number;
  reservationDate: string;
  reservationEndDate: string;
  notes: string;
  emissionDate?: string;
  expirationDate?: string;
}

function toUnixDateOnly(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export class CreateQuoteSale {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly clientRepository: ClientRepository,
    private readonly variantPricing: VariantPricingRepository,
    private readonly salesRepository: SalesRepository
  ) {}

  async execute(params: CreateQuoteSaleParams): Promise<QuoteSale> {
    const variant = await this.catalogRepository.getVariantByProductId(params.productId, params.type);
    const pricing = await this.variantPricing.resolve(variant.id, variant.productId);
    const clientId = await this.clientRepository.upsertByEmail(params.customer);

    const emissionIso = params.emissionDate ?? todayIsoDate();
    const expirationIso = params.expirationDate ?? addDaysIsoDate(emissionIso, 7);
    const salesIdPrefix = params.type === 'lodge' ? 'ONA-LODGE' : 'ONA-GUIDE';

    return this.salesRepository.createQuote({
      serviceType: params.type,
      variant,
      pricing,
      clientId,
      customer: params.customer,
      quantity: params.quantity ?? 1,
      reservationDate: params.reservationDate,
      reservationEndDate: params.reservationEndDate,
      notes: params.notes,
      emissionDate: toUnixDateOnly(emissionIso),
      expirationDate: toUnixDateOnly(expirationIso),
      salesId: `${salesIdPrefix}-${randomUUID()}`
    });
  }
}
