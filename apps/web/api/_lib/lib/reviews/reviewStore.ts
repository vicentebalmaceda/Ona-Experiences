import type { CatalogType } from '../../types/catalog.js';
import type {
  ProductRecord,
  ReviewAggregate,
  ReviewInviteRecord,
  ReviewRecord
} from '../../types/reviews.js';

export interface UpsertProductInput {
  catalogType: CatalogType;
  bsaleProductId: number;
  name: string;
  active?: boolean;
}

export interface CreateInviteInput {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  tokenHash: string;
  expiresAt: Date;
  bsaleDocumentId: number | null;
  bsaleVariantId: number | null;
  adminNote: string | null;
}

export interface CreateReviewInput {
  productId: string;
  inviteId: string;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: Date;
}

export interface ReviewStore {
  upsertProduct(input: UpsertProductInput): Promise<ProductRecord>;
  getProductById(id: string): Promise<ProductRecord | null>;
  getProductByExternalKey(
    catalogType: CatalogType,
    bsaleProductId: number
  ): Promise<ProductRecord | null>;
  findReviewedInviteByDocumentId(bsaleDocumentId: number): Promise<ReviewInviteRecord | null>;
  revokeUnusedInvitesForDocument(bsaleDocumentId: number, revokedAt: Date): Promise<void>;
  createInvite(input: CreateInviteInput): Promise<ReviewInviteRecord>;
  findInviteByTokenHash(tokenHash: string): Promise<ReviewInviteRecord | null>;
  markInviteUsed(inviteId: string, usedAt: Date): Promise<void>;
  createReview(input: CreateReviewInput): Promise<ReviewRecord>;
  getReviewById(id: string): Promise<ReviewRecord | null>;
  setReviewHidden(id: string, hiddenAt: Date | null): Promise<ReviewRecord>;
  listVisibleReviews(productId: string, limit: number): Promise<ReviewRecord[]>;
  getVisibleAggregate(productId: string): Promise<ReviewAggregate>;
  getVisibleAggregatesByExternalKeys(
    keys: Array<{ catalogType: CatalogType; bsaleProductId: number }>
  ): Promise<Map<string, ReviewAggregate>>;
}
