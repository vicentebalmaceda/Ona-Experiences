export interface QuoteRecord {
  id: string;
  bsaleDocumentId: number;
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  bsaleClientId: number | null;
  bsaleVariantId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertQuoteInput {
  bsaleDocumentId: number;
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  bsaleClientId: number | null;
  bsaleVariantId: number;
}

export interface QuoteStore {
  upsertQuote(input: UpsertQuoteInput): Promise<QuoteRecord>;
  getByBsaleDocumentId(bsaleDocumentId: number): Promise<QuoteRecord | null>;
}
