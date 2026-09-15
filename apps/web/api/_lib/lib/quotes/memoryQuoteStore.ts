import { randomUUID } from 'node:crypto';
import type { QuoteRecord, QuoteStore, UpsertQuoteInput } from './quoteStore.js';

export class MemoryQuoteStore implements QuoteStore {
  readonly quotes = new Map<string, QuoteRecord>();

  async upsertQuote(input: UpsertQuoteInput): Promise<QuoteRecord> {
    const existing = [...this.quotes.values()].find(
      (quote) => quote.bsaleDocumentId === input.bsaleDocumentId
    );
    const now = new Date();
    if (existing) {
      const updated: QuoteRecord = {
        ...existing,
        productId: input.productId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        bsaleClientId: input.bsaleClientId,
        bsaleVariantId: input.bsaleVariantId,
        updatedAt: now
      };
      this.quotes.set(existing.id, updated);
      return updated;
    }

    const created: QuoteRecord = {
      id: randomUUID(),
      bsaleDocumentId: input.bsaleDocumentId,
      productId: input.productId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      bsaleClientId: input.bsaleClientId,
      bsaleVariantId: input.bsaleVariantId,
      createdAt: now,
      updatedAt: now
    };
    this.quotes.set(created.id, created);
    return created;
  }

  async getByBsaleDocumentId(bsaleDocumentId: number): Promise<QuoteRecord | null> {
    return (
      [...this.quotes.values()].find((quote) => quote.bsaleDocumentId === bsaleDocumentId) ?? null
    );
  }
}
