import { describe, expect, it, vi } from 'vitest';
import { MemoryQuoteStore } from '../lib/quotes/memoryQuoteStore.js';
import { MemoryReviewStore } from '../lib/reviews/memoryReviewStore.js';
import type { QuoteInviteResolver, ResolvedQuoteForInvite } from '../types/reviews.js';
import { DomainError } from '../types/errors.js';
import { BsaleQuoteCapture } from './bsaleQuoteCapture.js';

const resolved: ResolvedQuoteForInvite = {
  customer: { email: 'Maria@Example.com', firstName: 'María', lastName: 'González' },
  catalogType: 'lodge',
  bsaleProductId: 2018,
  productName: 'Epu Lodge',
  productActive: true,
  bsaleVariantId: 7917
};

describe('BsaleQuoteCapture', () => {
  it('upserts Product and Quote when the document is invite-ready', async () => {
    const reviewStore = new MemoryReviewStore();
    const quoteStore = new MemoryQuoteStore();
    const resolver: QuoteInviteResolver = {
      resolve: vi.fn().mockResolvedValue(resolved)
    };
    const capture = new BsaleQuoteCapture({ resolver, reviewStore, quoteStore });

    await expect(capture.captureFromDocumentId(6634, 9)).resolves.toBe(true);

    const product = await reviewStore.getProductByExternalKey('lodge', 2018);
    expect(product).toMatchObject({ name: 'Epu Lodge', active: true });
    const quote = await quoteStore.getByBsaleDocumentId(6634);
    expect(quote).toMatchObject({
      productId: product!.id,
      email: 'maria@example.com',
      firstName: 'María',
      lastName: 'González',
      bsaleClientId: 9,
      bsaleVariantId: 7917
    });
  });

  it('skips persist when the Quote is not invite-ready', async () => {
    const reviewStore = new MemoryReviewStore();
    const quoteStore = new MemoryQuoteStore();
    const resolver: QuoteInviteResolver = {
      resolve: vi.fn().mockRejectedValue(
        new DomainError('Quote must have exactly one line item', 422, 'QUOTE_LINE_COUNT')
      )
    };
    const capture = new BsaleQuoteCapture({ resolver, reviewStore, quoteStore });

    await expect(capture.captureFromDocumentId(6634)).resolves.toBe(false);
    expect(quoteStore.quotes.size).toBe(0);
  });

  it('propagates unexpected resolver failures', async () => {
    const capture = new BsaleQuoteCapture({
      resolver: { resolve: vi.fn().mockRejectedValue(new Error('bsale down')) },
      reviewStore: new MemoryReviewStore(),
      quoteStore: new MemoryQuoteStore()
    });

    await expect(capture.captureFromDocumentId(6634)).rejects.toThrow('bsale down');
  });
});
