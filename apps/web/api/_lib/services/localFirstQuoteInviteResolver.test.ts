import { describe, expect, it, vi } from 'vitest';
import { MemoryQuoteStore } from '../lib/quotes/memoryQuoteStore.js';
import { MemoryReviewStore } from '../lib/reviews/memoryReviewStore.js';
import type { QuoteInviteResolver, ResolvedQuoteForInvite } from '../types/reviews.js';
import { LocalFirstQuoteInviteResolver } from './localFirstQuoteInviteResolver.js';

const fromBsale: ResolvedQuoteForInvite = {
  customer: { email: 'live@example.com', firstName: 'Live', lastName: 'Fetch' },
  catalogType: 'guide',
  bsaleProductId: 99,
  productName: 'Live Guide',
  productActive: true,
  bsaleVariantId: 1
};

describe('LocalFirstQuoteInviteResolver', () => {
  it('returns the local Quote without calling BSale when present', async () => {
    const reviewStore = new MemoryReviewStore();
    const quoteStore = new MemoryQuoteStore();
    const product = await reviewStore.upsertProduct({
      catalogType: 'lodge',
      bsaleProductId: 2018,
      name: 'Epu Lodge',
      active: false
    });
    await quoteStore.upsertQuote({
      bsaleDocumentId: 6634,
      productId: product.id,
      email: 'maria@example.com',
      firstName: 'María',
      lastName: 'González',
      bsaleClientId: 9,
      bsaleVariantId: 7917
    });

    const fallback: QuoteInviteResolver = { resolve: vi.fn().mockResolvedValue(fromBsale) };
    const resolver = new LocalFirstQuoteInviteResolver({ quoteStore, reviewStore, fallback });

    await expect(resolver.resolve(6634)).resolves.toEqual({
      customer: { email: 'maria@example.com', firstName: 'María', lastName: 'González' },
      catalogType: 'lodge',
      bsaleProductId: 2018,
      productName: 'Epu Lodge',
      productActive: false,
      bsaleVariantId: 7917
    });
    expect(fallback.resolve).not.toHaveBeenCalled();
  });

  it('falls back to BSale when no local Quote exists', async () => {
    const fallback: QuoteInviteResolver = { resolve: vi.fn().mockResolvedValue(fromBsale) };
    const resolver = new LocalFirstQuoteInviteResolver({
      quoteStore: new MemoryQuoteStore(),
      reviewStore: new MemoryReviewStore(),
      fallback
    });

    await expect(resolver.resolve(9001)).resolves.toEqual(fromBsale);
    expect(fallback.resolve).toHaveBeenCalledWith(9001);
  });

  it('falls back to BSale when the Quote Product row is missing', async () => {
    const quoteStore = new MemoryQuoteStore();
    await quoteStore.upsertQuote({
      bsaleDocumentId: 6634,
      productId: '00000000-0000-0000-0000-000000000099',
      email: 'maria@example.com',
      firstName: 'María',
      lastName: 'González',
      bsaleClientId: 9,
      bsaleVariantId: 7917
    });
    const fallback: QuoteInviteResolver = { resolve: vi.fn().mockResolvedValue(fromBsale) };
    const resolver = new LocalFirstQuoteInviteResolver({
      quoteStore,
      reviewStore: new MemoryReviewStore(),
      fallback
    });

    await expect(resolver.resolve(6634)).resolves.toEqual(fromBsale);
    expect(fallback.resolve).toHaveBeenCalledWith(6634);
  });
});
