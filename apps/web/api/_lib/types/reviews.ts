import type { CatalogType } from './catalog.js';

export interface ReviewCustomer {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateReviewInviteInput {
  catalogType: CatalogType;
  bsaleProductId: number;
  customer: ReviewCustomer;
  bsaleDocumentId?: number;
  bsaleVariantId?: number;
  adminNote?: string;
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

export interface CatalogProductLookup {
  get(
    type: CatalogType,
    productId: number
  ): Promise<{ productId: number; productName: string }>;
}

export function reviewAggregateKey(catalogType: CatalogType, bsaleProductId: number): string {
  return `${catalogType}:${bsaleProductId}`;
}
