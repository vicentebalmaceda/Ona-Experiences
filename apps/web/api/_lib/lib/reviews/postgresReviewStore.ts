import type { NeonQueryFunction } from '@neondatabase/serverless';
import { asDate } from '../../db/postgres.js';
import type { CatalogType } from '../../types/catalog.js';
import type {
  ProductRecord,
  ReviewAggregate,
  ReviewInviteRecord,
  ReviewRecord
} from '../../types/reviews.js';
import { reviewAggregateKey } from '../../types/reviews.js';
import type {
  CreateInviteInput,
  CreateReviewInput,
  ReviewStore,
  UpsertProductInput
} from './reviewStore.js';

const EMPTY: ReviewAggregate = { average: null, count: 0 };

interface ProductRow {
  id: string;
  catalog_type: CatalogType;
  bsale_product_id: number;
  name: string;
  active: boolean;
}

interface InviteRow {
  id: string;
  product_id: string;
  email: string;
  first_name: string;
  last_name: string;
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  bsale_document_id: number | null;
  bsale_variant_id: number | null;
  admin_note: string | null;
}

interface ReviewRow {
  id: string;
  product_id: string;
  invite_id: string;
  rating: number;
  comment: string;
  display_name: string;
  hidden_at: Date | string | null;
  created_at: Date | string;
}

interface AggregateRow {
  catalog_type: CatalogType;
  bsale_product_id: number;
  count: number;
  average: number | string | null;
}

export class PostgresReviewStore implements ReviewStore {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async upsertProduct(input: UpsertProductInput): Promise<ProductRecord> {
    const rows = await this.sql`
      INSERT INTO products (catalog_type, bsale_product_id, name, active, updated_at)
      VALUES (${input.catalogType}, ${input.bsaleProductId}, ${input.name}, true, now())
      ON CONFLICT (catalog_type, bsale_product_id)
      DO UPDATE SET name = excluded.name, active = true, updated_at = now()
      RETURNING id, catalog_type, bsale_product_id, name, active
    `;
    return toProduct(rows[0] as ProductRow);
  }

  async getProductById(id: string): Promise<ProductRecord | null> {
    const rows = await this.sql`
      SELECT id, catalog_type, bsale_product_id, name, active
      FROM products WHERE id = ${id}
    `;
    return rows[0] ? toProduct(rows[0] as ProductRow) : null;
  }

  async getProductByExternalKey(
    catalogType: CatalogType,
    bsaleProductId: number
  ): Promise<ProductRecord | null> {
    const rows = await this.sql`
      SELECT id, catalog_type, bsale_product_id, name, active
      FROM products
      WHERE catalog_type = ${catalogType} AND bsale_product_id = ${bsaleProductId}
    `;
    return rows[0] ? toProduct(rows[0] as ProductRow) : null;
  }

  async revokeUnusedInvites(productId: string, email: string, revokedAt: Date): Promise<void> {
    await this.sql`
      UPDATE review_invites
      SET revoked_at = ${revokedAt.toISOString()}
      WHERE product_id = ${productId}
        AND email = ${email}
        AND used_at IS NULL
        AND revoked_at IS NULL
    `;
  }

  async createInvite(input: CreateInviteInput): Promise<ReviewInviteRecord> {
    const rows = await this.sql`
      INSERT INTO review_invites (
        product_id, email, first_name, last_name, token_hash, expires_at,
        bsale_document_id, bsale_variant_id, admin_note
      )
      VALUES (
        ${input.productId}, ${input.email}, ${input.firstName}, ${input.lastName},
        ${input.tokenHash}, ${input.expiresAt.toISOString()},
        ${input.bsaleDocumentId}, ${input.bsaleVariantId}, ${input.adminNote}
      )
      RETURNING id, product_id, email, first_name, last_name, token_hash, expires_at,
        used_at, revoked_at, bsale_document_id, bsale_variant_id, admin_note
    `;
    return toInvite(rows[0] as InviteRow);
  }

  async findInviteByTokenHash(tokenHash: string): Promise<ReviewInviteRecord | null> {
    const rows = await this.sql`
      SELECT id, product_id, email, first_name, last_name, token_hash, expires_at,
        used_at, revoked_at, bsale_document_id, bsale_variant_id, admin_note
      FROM review_invites WHERE token_hash = ${tokenHash}
    `;
    return rows[0] ? toInvite(rows[0] as InviteRow) : null;
  }

  async markInviteUsed(inviteId: string, usedAt: Date): Promise<void> {
    await this.sql`
      UPDATE review_invites SET used_at = ${usedAt.toISOString()} WHERE id = ${inviteId}
    `;
  }

  async createReview(input: CreateReviewInput): Promise<ReviewRecord> {
    const rows = await this.sql`
      INSERT INTO reviews (product_id, invite_id, rating, comment, display_name, created_at)
      VALUES (
        ${input.productId}, ${input.inviteId}, ${input.rating}, ${input.comment},
        ${input.displayName}, ${input.createdAt.toISOString()}
      )
      RETURNING id, product_id, invite_id, rating, comment, display_name, hidden_at, created_at
    `;
    return toReview(rows[0] as ReviewRow);
  }

  async getReviewById(id: string): Promise<ReviewRecord | null> {
    const rows = await this.sql`
      SELECT id, product_id, invite_id, rating, comment, display_name, hidden_at, created_at
      FROM reviews WHERE id = ${id}
    `;
    return rows[0] ? toReview(rows[0] as ReviewRow) : null;
  }

  async setReviewHidden(id: string, hiddenAt: Date | null): Promise<ReviewRecord> {
    const rows = await this.sql`
      UPDATE reviews SET hidden_at = ${hiddenAt ? hiddenAt.toISOString() : null}
      WHERE id = ${id}
      RETURNING id, product_id, invite_id, rating, comment, display_name, hidden_at, created_at
    `;
    if (!rows[0]) {
      throw new Error(`Review not found: ${id}`);
    }
    return toReview(rows[0] as ReviewRow);
  }

  async listVisibleReviews(productId: string, limit: number): Promise<ReviewRecord[]> {
    const rows = await this.sql`
      SELECT id, product_id, invite_id, rating, comment, display_name, hidden_at, created_at
      FROM reviews
      WHERE product_id = ${productId} AND hidden_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return (rows as ReviewRow[]).map(toReview);
  }

  async getVisibleAggregate(productId: string): Promise<ReviewAggregate> {
    const rows = await this.sql`
      SELECT COUNT(*)::int AS count, AVG(rating) AS average
      FROM reviews
      WHERE product_id = ${productId} AND hidden_at IS NULL
    `;
    return toAggregateValue(rows[0] as { count: number; average: number | string | null });
  }

  async getVisibleAggregatesByExternalKeys(
    keys: Array<{ catalogType: CatalogType; bsaleProductId: number }>
  ): Promise<Map<string, ReviewAggregate>> {
    const result = new Map<string, ReviewAggregate>();
    for (const key of keys) {
      result.set(reviewAggregateKey(key.catalogType, key.bsaleProductId), EMPTY);
    }

    const byType = new Map<CatalogType, number[]>();
    for (const key of keys) {
      const ids = byType.get(key.catalogType) ?? [];
      ids.push(key.bsaleProductId);
      byType.set(key.catalogType, ids);
    }

    for (const [catalogType, ids] of byType) {
      const rows = await this.sql`
        SELECT
          p.catalog_type,
          p.bsale_product_id,
          COUNT(r.id) FILTER (WHERE r.hidden_at IS NULL)::int AS count,
          AVG(r.rating) FILTER (WHERE r.hidden_at IS NULL) AS average
        FROM products p
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE p.catalog_type = ${catalogType}
          AND p.bsale_product_id = ANY(${ids})
        GROUP BY p.catalog_type, p.bsale_product_id
      `;
      for (const row of rows as AggregateRow[]) {
        result.set(
          reviewAggregateKey(row.catalog_type, Number(row.bsale_product_id)),
          toAggregateValue(row)
        );
      }
    }

    return result;
  }
}

function toProduct(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    catalogType: row.catalog_type,
    bsaleProductId: Number(row.bsale_product_id),
    name: row.name,
    active: row.active
  };
}

function toInvite(row: InviteRow): ReviewInviteRecord {
  return {
    id: row.id,
    productId: row.product_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    tokenHash: row.token_hash,
    expiresAt: asDate(row.expires_at),
    usedAt: row.used_at ? asDate(row.used_at) : null,
    revokedAt: row.revoked_at ? asDate(row.revoked_at) : null,
    bsaleDocumentId: row.bsale_document_id,
    bsaleVariantId: row.bsale_variant_id,
    adminNote: row.admin_note
  };
}

function toReview(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    productId: row.product_id,
    inviteId: row.invite_id,
    rating: Number(row.rating),
    comment: row.comment,
    displayName: row.display_name,
    hiddenAt: row.hidden_at ? asDate(row.hidden_at) : null,
    createdAt: asDate(row.created_at)
  };
}

function toAggregateValue(row: { count: number; average: number | string | null }): ReviewAggregate {
  const count = Number(row.count ?? 0);
  if (count === 0 || row.average == null) return EMPTY;
  return { average: Number(Number(row.average).toFixed(1)), count };
}
