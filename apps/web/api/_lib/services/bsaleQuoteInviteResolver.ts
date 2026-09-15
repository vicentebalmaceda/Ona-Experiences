import type { Env } from '../config/env.js';
import type { BsaleClientRepository } from '../lib/bsale/clients.js';
import type { BsaleSalesRepository } from '../lib/bsale/documents.js';
import type { BsaleClient } from '../lib/bsale/client.js';
import type { BsaleProductTypeResolver } from '../lib/bsale/products.js';
import type { BsaleClient as BsaleClientRecord, BsaleDocument, BsaleProduct } from '../types/bsale.js';
import { DomainError } from '../types/errors.js';
import type { QuoteInviteResolver, ResolvedQuoteForInvite } from '../types/reviews.js';

function resolveDocumentTypeId(document: BsaleDocument): number | undefined {
  const raw = document.documentTypeId ?? document.document_type?.id;
  if (raw == null) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isExpandedClient(client: BsaleDocument['client']): client is BsaleClientRecord {
  return Boolean(client && 'firstName' in client);
}

function clientIdFromDocument(document: BsaleDocument): number | undefined {
  const client = document.client;
  if (!client || !('id' in client) || client.id == null) return undefined;
  const parsed = Number(client.id);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class BsaleQuoteInviteResolver implements QuoteInviteResolver {
  constructor(
    private readonly deps: {
      sales: BsaleSalesRepository;
      clients: BsaleClientRepository;
      bsale: BsaleClient;
      productTypes: BsaleProductTypeResolver;
      env: Env;
    }
  ) {}

  async resolve(bsaleDocumentId: number): Promise<ResolvedQuoteForInvite> {
    const document = await this.deps.sales.getDocument(bsaleDocumentId);
    const documentTypeId = resolveDocumentTypeId(document);
    if (documentTypeId !== this.deps.env.BSALE_QUOTE_DOCUMENT_TYPE_ID) {
      throw new DomainError('Document is not a Quote', 422, 'NOT_A_QUOTE');
    }

    const details = await this.deps.sales.getDocumentDetails(bsaleDocumentId);
    if (details.count !== 1 || details.items.length !== 1) {
      throw new DomainError(
        'Quote must have exactly one line item',
        422,
        'QUOTE_LINE_COUNT'
      );
    }

    const line = details.items[0];
    const bsaleProductId = line.product?.id != null ? Number(line.product.id) : NaN;
    const bsaleVariantId =
      line.variant?.id != null
        ? Number(line.variant.id)
        : line.variantId != null
          ? Number(line.variantId)
          : NaN;

    if (!Number.isFinite(bsaleProductId) || !Number.isFinite(bsaleVariantId)) {
      throw new DomainError(
        'Quote line must include product and variant ids',
        422,
        'QUOTE_LINE_INCOMPLETE'
      );
    }

    const product = await this.deps.bsale.get<BsaleProduct>(`/products/${bsaleProductId}.json`);
    const catalogType = await this.deps.productTypes.resolveCatalogType(product);
    const productName = product.name?.trim() || line.product?.name?.trim();
    if (!productName) {
      throw new DomainError('Quote product has no name', 422, 'PRODUCT_NAME_MISSING');
    }

    const customer = await this.resolveCustomer(document);
    if (!customer.email?.trim()) {
      throw new DomainError('Quote Customer has no email', 422, 'CUSTOMER_EMAIL_MISSING');
    }
    if (!customer.firstName?.trim() || !customer.lastName?.trim()) {
      throw new DomainError('Quote Customer is missing a name', 422, 'CUSTOMER_NAME_MISSING');
    }

    return {
      customer: {
        email: customer.email.trim(),
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim()
      },
      catalogType,
      bsaleProductId,
      productName,
      productActive: product.state === 0,
      bsaleVariantId
    };
  }

  private async resolveCustomer(document: BsaleDocument): Promise<BsaleClientRecord> {
    if (isExpandedClient(document.client)) {
      return document.client;
    }

    const clientId = clientIdFromDocument(document);
    if (clientId == null) {
      throw new DomainError('Quote has no Customer', 422, 'CUSTOMER_MISSING');
    }

    return this.deps.clients.getById(clientId);
  }
}
