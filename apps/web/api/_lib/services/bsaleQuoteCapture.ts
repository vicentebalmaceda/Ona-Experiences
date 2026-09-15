import type { ReviewStore } from '../lib/reviews/reviewStore.js';
import type { QuoteStore } from '../lib/quotes/quoteStore.js';
import { DomainError } from '../types/errors.js';
import type { QuoteInviteResolver } from '../types/reviews.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('quote-capture');

/** DomainError codes that mean the cotización is not invite-ready (skip persist, still email). */
export const QUOTE_NOT_INVITE_READY_CODES = new Set([
  'NOT_A_QUOTE',
  'QUOTE_LINE_COUNT',
  'QUOTE_LINE_INCOMPLETE',
  'CUSTOMER_MISSING',
  'CUSTOMER_EMAIL_MISSING',
  'CUSTOMER_NAME_MISSING',
  'PRODUCT_NAME_MISSING',
  'PRODUCT_TYPE_MISSING',
  'UNSUPPORTED_PRODUCT_TYPE'
]);

export function isQuoteNotInviteReady(error: unknown): boolean {
  return error instanceof DomainError && Boolean(error.code && QUOTE_NOT_INVITE_READY_CODES.has(error.code));
}

export interface QuoteCapture {
  /**
   * Resolves invite fuel from BSale, upserts Product + Quote.
   * Returns true when a Quote was stored; false when the document is not invite-ready.
   * Propagates infrastructure / unexpected errors.
   */
  captureFromDocumentId(bsaleDocumentId: number, bsaleClientId?: number | null): Promise<boolean>;
}

export class BsaleQuoteCapture implements QuoteCapture {
  constructor(
    private readonly deps: {
      resolver: QuoteInviteResolver;
      reviewStore: ReviewStore;
      quoteStore: QuoteStore;
    }
  ) {}

  async captureFromDocumentId(
    bsaleDocumentId: number,
    bsaleClientId: number | null = null
  ): Promise<boolean> {
    let resolved;
    try {
      resolved = await this.deps.resolver.resolve(bsaleDocumentId);
    } catch (error) {
      if (isQuoteNotInviteReady(error)) {
        log.info('Quote not invite-ready; skipping persist', {
          bsaleDocumentId,
          code: error instanceof DomainError ? error.code : undefined
        });
        return false;
      }
      throw error;
    }

    const product = await this.deps.reviewStore.upsertProduct({
      catalogType: resolved.catalogType,
      bsaleProductId: resolved.bsaleProductId,
      name: resolved.productName,
      active: resolved.productActive
    });

    await this.deps.quoteStore.upsertQuote({
      bsaleDocumentId,
      productId: product.id,
      email: resolved.customer.email.trim().toLowerCase(),
      firstName: resolved.customer.firstName.trim(),
      lastName: resolved.customer.lastName.trim(),
      bsaleClientId,
      bsaleVariantId: resolved.bsaleVariantId
    });

    return true;
  }
}
