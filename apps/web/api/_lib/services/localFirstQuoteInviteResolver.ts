import type { ReviewStore } from '../lib/reviews/reviewStore.js';
import type { QuoteStore } from '../lib/quotes/quoteStore.js';
import type { QuoteInviteResolver, ResolvedQuoteForInvite } from '../types/reviews.js';

/**
 * Prefer a locally persisted Quote; fall back to live BSale resolution.
 */
export class LocalFirstQuoteInviteResolver implements QuoteInviteResolver {
  constructor(
    private readonly deps: {
      quoteStore: QuoteStore;
      reviewStore: ReviewStore;
      fallback: QuoteInviteResolver;
    }
  ) {}

  async resolve(bsaleDocumentId: number): Promise<ResolvedQuoteForInvite> {
    const quote = await this.deps.quoteStore.getByBsaleDocumentId(bsaleDocumentId);
    if (!quote) {
      return this.deps.fallback.resolve(bsaleDocumentId);
    }

    const product = await this.deps.reviewStore.getProductById(quote.productId);
    if (!product) {
      return this.deps.fallback.resolve(bsaleDocumentId);
    }

    return {
      customer: {
        email: quote.email,
        firstName: quote.firstName,
        lastName: quote.lastName
      },
      catalogType: product.catalogType,
      bsaleProductId: product.bsaleProductId,
      productName: product.name,
      productActive: product.active,
      bsaleVariantId: quote.bsaleVariantId
    };
  }
}
