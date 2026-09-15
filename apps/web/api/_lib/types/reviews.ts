import type { CatalogType } from './catalog.js';

export interface ReviewCustomer {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateReviewInviteInput {
  bsaleDocumentId: number;
  adminNote?: string;
}

/** Quote fields needed to issue a Review Invite (resolved from BSale). */
export interface ResolvedQuoteForInvite {
  customer: ReviewCustomer;
  catalogType: CatalogType;
  bsaleProductId: number;
  productName: string;
  productActive: boolean;
  bsaleVariantId: number;
}

export interface QuoteInviteResolver {
  resolve(bsaleDocumentId: number): Promise<ResolvedQuoteForInvite>;
}

export interface ProductRecord {
  id: string;
  catalogType: CatalogType;
  bsaleProductId: number;
  name: string;
  active: boolean;
}

export interface ReviewInviteRecord {
  id: string;
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  bsaleDocumentId: number | null;
  bsaleVariantId: number | null;
  adminNote: string | null;
}

export interface ReviewRecord {
  id: string;
  productId: string;
  inviteId: string;
  rating: number;
  comment: string;
  displayName: string;
  hiddenAt: Date | null;
  createdAt: Date;
}

export interface ReviewAggregate {
  average: number | null;
  count: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: string;
}

export interface ProductReviewsView {
  average: number | null;
  count: number;
  items: PublicReview[];
}

export interface ReviewInvitePreview {
  productName: string;
  catalogType: CatalogType;
  expiresAt: string;
}

export function reviewAggregateKey(catalogType: CatalogType, bsaleProductId: number): string {
  return `${catalogType}:${bsaleProductId}`;
}
