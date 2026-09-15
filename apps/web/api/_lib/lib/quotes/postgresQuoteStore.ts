import type { NeonQueryFunction } from '@neondatabase/serverless';
import { asDate } from '../../db/postgres.js';
import type { QuoteRecord, QuoteStore, UpsertQuoteInput } from './quoteStore.js';

interface QuoteRow {
  id: string;
  bsale_document_id: number;
  product_id: string;
  email: string;
  first_name: string;
  last_name: string;
  bsale_client_id: number | null;
  bsale_variant_id: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class PostgresQuoteStore implements QuoteStore {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async upsertQuote(input: UpsertQuoteInput): Promise<QuoteRecord> {
    const rows = await this.sql`
      INSERT INTO quotes (
        bsale_document_id, product_id, email, first_name, last_name,
        bsale_client_id, bsale_variant_id, updated_at
      )
      VALUES (
        ${input.bsaleDocumentId}, ${input.productId}, ${input.email},
        ${input.firstName}, ${input.lastName}, ${input.bsaleClientId},
        ${input.bsaleVariantId}, now()
      )
      ON CONFLICT (bsale_document_id)
      DO UPDATE SET
        product_id = excluded.product_id,
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        bsale_client_id = excluded.bsale_client_id,
        bsale_variant_id = excluded.bsale_variant_id,
        updated_at = now()
      RETURNING id, bsale_document_id, product_id, email, first_name, last_name,
        bsale_client_id, bsale_variant_id, created_at, updated_at
    `;
    return toQuote(rows[0] as QuoteRow);
  }

  async getByBsaleDocumentId(bsaleDocumentId: number): Promise<QuoteRecord | null> {
    const rows = await this.sql`
      SELECT id, bsale_document_id, product_id, email, first_name, last_name,
        bsale_client_id, bsale_variant_id, created_at, updated_at
      FROM quotes
      WHERE bsale_document_id = ${bsaleDocumentId}
      LIMIT 1
    `;
    return rows[0] ? toQuote(rows[0] as QuoteRow) : null;
  }
}

function toQuote(row: QuoteRow): QuoteRecord {
  return {
    id: row.id,
    bsaleDocumentId: Number(row.bsale_document_id),
    productId: row.product_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    bsaleClientId: row.bsale_client_id == null ? null : Number(row.bsale_client_id),
    bsaleVariantId: Number(row.bsale_variant_id),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at)
  };
}
