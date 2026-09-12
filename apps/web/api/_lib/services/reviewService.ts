import { createHash, randomBytes } from 'node:crypto';
import { formatReviewDisplayName } from '../lib/reviews/displayName.js';
import { createLogger } from '../utils/logger.js';
import type { ReviewStore } from '../lib/reviews/reviewStore.js';
import type { Mailer, ReviewInviteEmail, ReviewSubmittedEmail } from '../mailer/types.js';
import type { CatalogType } from '../types/catalog.js';
import { DomainError } from '../types/errors.js';
import type {
  CatalogProductLookup,
  CreateReviewInviteInput,
  ProductReviewsView,
  PublicReview,
  ReviewAggregate,
  ReviewInvitePreview,
  ReviewInviteRecord,
  ReviewRecord
} from '../types/reviews.js';
import { reviewAggregateKey } from '../types/reviews.js';

export const REVIEW_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REVIEW_COMMENT_MIN = 20;
export const REVIEW_COMMENT_MAX = 500;
export const PUBLIC_REVIEW_LIMIT = 5;

const log = createLogger('reviews');

export interface ReviewServiceDeps {
  store: ReviewStore;
  catalog: CatalogProductLookup;
  mailer: Mailer;
  publicAppUrl: string;
  now?: () => Date;
  createToken?: () => string;
}

export class ReviewService {
  private readonly now: () => Date;
  private readonly createToken: () => string;

  constructor(private readonly deps: ReviewServiceDeps) {
    this.now = deps.now ?? (() => new Date());
    this.createToken = deps.createToken ?? createInviteToken;
  }

  async createInvite(input: CreateReviewInviteInput): Promise<{ inviteId: string; expiresAt: string }> {
    const variant = await this.deps.catalog.get(input.catalogType, input.bsaleProductId);
    const product = await this.deps.store.upsertProduct({
      catalogType: input.catalogType,
      bsaleProductId: variant.productId,
      name: variant.productName
    });

    const email = normalizeEmail(input.customer.email);
    const now = this.now();
    await this.deps.store.revokeUnusedInvites(product.id, email, now);

    const token = this.createToken();
    const expiresAt = new Date(now.getTime() + REVIEW_INVITE_TTL_MS);
    const invite = await this.deps.store.createInvite({
      productId: product.id,
      email,
      firstName: input.customer.firstName.trim(),
      lastName: input.customer.lastName.trim(),
      tokenHash: hashInviteToken(token),
      expiresAt,
      bsaleDocumentId: input.bsaleDocumentId ?? null,
      bsaleVariantId: input.bsaleVariantId ?? null,
      adminNote: input.adminNote?.trim() || null
    });

    const payload: ReviewInviteEmail = {
      to: email,
      firstName: invite.firstName,
      productName: product.name,
      reviewUrl: inviteUrl(this.deps.publicAppUrl, token),
      expiresAt: expiresAt.toISOString()
    };
    await this.deps.mailer.sendReviewInvite(payload);

    return { inviteId: invite.id, expiresAt: expiresAt.toISOString() };
  }

  async previewInvite(token: string): Promise<ReviewInvitePreview> {
    const { invite, product } = await this.requireRedeemableInvite(token);
    return {
      productName: product.name,
      catalogType: product.catalogType,
      expiresAt: invite.expiresAt.toISOString()
    };
  }

  async submitReview(token: string, rating: number, comment: string): Promise<{ reviewId: string }> {
    const { invite, product } = await this.requireRedeemableInvite(token);
    const trimmed = comment.trim();
    assertRating(rating);
    assertComment(trimmed);

    const now = this.now();
    const review = await this.deps.store.createReview({
      productId: product.id,
      inviteId: invite.id,
      rating,
      comment: trimmed,
      displayName: formatReviewDisplayName(invite.firstName, invite.lastName),
      createdAt: now
    });
    await this.deps.store.markInviteUsed(invite.id, now);

    const submitted: ReviewSubmittedEmail = {
      customerEmail: invite.email,
      firstName: invite.firstName,
      lastName: invite.lastName,
      productName: product.name,
      catalogType: product.catalogType,
      rating,
      comment: trimmed,
      reviewId: review.id
    };
    try {
      await this.deps.mailer.sendReviewThankYou(submitted);
      await this.deps.mailer.sendReviewAdminNotification(submitted);
    } catch (error) {
      log.error('Review saved but notification emails failed', {
        reviewId: review.id,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return { reviewId: review.id };
  }

  async setReviewHidden(reviewId: string, hidden: boolean): Promise<void> {
    const existing = await this.deps.store.getReviewById(reviewId);
    if (!existing) {
      throw new DomainError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }
    await this.deps.store.setReviewHidden(reviewId, hidden ? this.now() : null);
  }

  async listVisibleForProduct(
    catalogType: CatalogType,
    bsaleProductId: number
  ): Promise<ProductReviewsView> {
    const product = await this.deps.store.getProductByExternalKey(catalogType, bsaleProductId);
    if (!product) {
      return { average: null, count: 0, items: [] };
    }

    const [aggregate, records] = await Promise.all([
      this.deps.store.getVisibleAggregate(product.id),
      this.deps.store.listVisibleReviews(product.id, PUBLIC_REVIEW_LIMIT)
    ]);

    return {
      average: aggregate.average,
      count: aggregate.count,
      items: records.map(toPublicReview)
    };
  }

  async getAggregatesFor(
    keys: Array<{ catalogType: CatalogType; bsaleProductId: number }>
  ): Promise<Map<string, ReviewAggregate>> {
    if (keys.length === 0) return new Map();
    return this.deps.store.getVisibleAggregatesByExternalKeys(keys);
  }

  private async requireRedeemableInvite(token: string): Promise<{
    invite: ReviewInviteRecord;
    product: NonNullable<Awaited<ReturnType<ReviewStore['getProductById']>>>;
  }> {
    const invite = await this.deps.store.findInviteByTokenHash(hashInviteToken(token));
    if (!invite) {
      throw new DomainError('Review invite not found', 404, 'INVITE_NOT_FOUND');
    }
    if (invite.revokedAt) {
      throw new DomainError('Review invite is no longer valid', 410, 'INVITE_REVOKED');
    }
    if (invite.usedAt) {
      throw new DomainError('Review invite already used', 409, 'INVITE_USED');
    }
    if (invite.expiresAt.getTime() <= this.now().getTime()) {
      throw new DomainError('Review invite expired', 410, 'INVITE_EXPIRED');
    }

    const product = await this.deps.store.getProductById(invite.productId);
    if (!product) {
      throw new DomainError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return { invite, product };
  }
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function aggregateLookup(
  aggregates: Map<string, ReviewAggregate>,
  catalogType: CatalogType,
  bsaleProductId: number
): ReviewAggregate {
  return aggregates.get(reviewAggregateKey(catalogType, bsaleProductId)) ?? {
    average: null,
    count: 0
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new DomainError('Rating must be an integer from 1 to 5', 400, 'INVALID_RATING');
  }
}

function assertComment(comment: string): void {
  if (comment.length < REVIEW_COMMENT_MIN || comment.length > REVIEW_COMMENT_MAX) {
    throw new DomainError(
      `Comment must be ${REVIEW_COMMENT_MIN} to ${REVIEW_COMMENT_MAX} characters`,
      400,
      'INVALID_COMMENT'
    );
  }
}

function toPublicReview(review: ReviewRecord): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    displayName: review.displayName,
    createdAt: review.createdAt.toISOString()
  };
}

function inviteUrl(publicAppUrl: string, token: string): string {
  return `${publicAppUrl.replace(/\/$/, '')}/review?token=${token}`;
}
