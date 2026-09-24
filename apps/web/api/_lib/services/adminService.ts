import type { QuoteStore } from '../lib/quotes/quoteStore.js';
import type { ReviewStore } from '../lib/reviews/reviewStore.js';
import { DomainError } from '../types/errors.js';
import type { CatalogType } from '../types/catalog.js';
import type { ReviewInviteRecord, ReviewRecord } from '../types/reviews.js';
import type { ReviewService } from './reviewService.js';

export type AdminInviteStatus = 'none' | 'open' | 'used' | 'expired' | 'revoked' | 'reviewed';

export interface AdminQuoteRow {
  quoteId: string;
  bsaleDocumentId: number;
  email: string;
  firstName: string;
  lastName: string;
  productId: string;
  productName: string;
  catalogType: CatalogType;
  createdAt: string;
  inviteStatus: AdminInviteStatus;
  openInviteId: string | null;
  openInviteExpiresAt: string | null;
  hasReview: boolean;
  canSend: boolean;
  canResend: boolean;
}

export interface AdminInviteRow {
  id: string;
  bsaleDocumentId: number | null;
  email: string;
  firstName: string;
  lastName: string;
  productName: string;
  catalogType: CatalogType | null;
  status: 'open' | 'used' | 'expired' | 'revoked';
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}

export interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string;
  displayName: string;
  productName: string;
  catalogType: CatalogType | null;
  visible: boolean;
  createdAt: string;
}

export interface AdminServiceDeps {
  quoteStore: QuoteStore;
  reviewStore: ReviewStore;
  reviewService: ReviewService;
  now?: () => Date;
}

export class AdminService {
  private readonly now: () => Date;

  constructor(private readonly deps: AdminServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async listQuotes(): Promise<AdminQuoteRow[]> {
    const quotes = await this.deps.quoteStore.listQuotes();
    const rows: AdminQuoteRow[] = [];
    for (const quote of quotes) {
      const product = await this.deps.reviewStore.getProductById(quote.productId);
      const hasReview = Boolean(
        await this.deps.reviewStore.findReviewedInviteByDocumentId(quote.bsaleDocumentId)
      );
      const openInvite = await this.deps.reviewStore.findOpenInviteByDocumentId(
        quote.bsaleDocumentId
      );
      const inviteStatus = resolveQuoteInviteStatus(openInvite, hasReview, this.now());
      rows.push({
        quoteId: quote.id,
        bsaleDocumentId: quote.bsaleDocumentId,
        email: quote.email,
        firstName: quote.firstName,
        lastName: quote.lastName,
        productId: quote.productId,
        productName: product?.name ?? 'Producto',
        catalogType: product?.catalogType ?? 'lodge',
        createdAt: quote.createdAt.toISOString(),
        inviteStatus,
        openInviteId: openInvite?.id ?? null,
        openInviteExpiresAt: openInvite ? openInvite.expiresAt.toISOString() : null,
        hasReview,
        canSend: !hasReview && !openInvite,
        canResend: !hasReview && Boolean(openInvite)
      });
    }
    return rows;
  }

  async listInvites(): Promise<AdminInviteRow[]> {
    const invites = await this.deps.reviewStore.listInvites();
    const rows: AdminInviteRow[] = [];
    for (const invite of invites) {
      const product = await this.deps.reviewStore.getProductById(invite.productId);
      rows.push({
        id: invite.id,
        bsaleDocumentId: invite.bsaleDocumentId,
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        productName: product?.name ?? 'Producto',
        catalogType: product?.catalogType ?? null,
        status: inviteListStatus(invite, this.now()),
        expiresAt: invite.expiresAt.toISOString(),
        usedAt: invite.usedAt?.toISOString() ?? null,
        revokedAt: invite.revokedAt?.toISOString() ?? null
      });
    }
    return rows;
  }

  async listReviews(): Promise<AdminReviewRow[]> {
    const reviews = await this.deps.reviewStore.listReviews();
    const rows: AdminReviewRow[] = [];
    for (const review of reviews) {
      const product = await this.deps.reviewStore.getProductById(review.productId);
      rows.push(toAdminReview(review, product?.name ?? 'Producto', product?.catalogType ?? null));
    }
    return rows;
  }

  async sendInvite(bsaleDocumentId: number, adminNote?: string) {
    await this.assertCanSend(bsaleDocumentId);
    return this.deps.reviewService.createInvite({ bsaleDocumentId, adminNote });
  }

  async resendInvite(bsaleDocumentId: number, adminNote?: string) {
    await this.assertCanResend(bsaleDocumentId);
    return this.deps.reviewService.createInvite({ bsaleDocumentId, adminNote });
  }

  async setReviewHidden(reviewId: string, hidden: boolean): Promise<void> {
    await this.deps.reviewService.setReviewHidden(reviewId, hidden);
  }

  private async assertCanSend(bsaleDocumentId: number): Promise<void> {
    const reviewed = await this.deps.reviewStore.findReviewedInviteByDocumentId(bsaleDocumentId);
    if (reviewed) {
      throw new DomainError('Quote already has a Review', 409, 'QUOTE_ALREADY_REVIEWED');
    }
    const open = await this.deps.reviewStore.findOpenInviteByDocumentId(bsaleDocumentId);
    if (open) {
      throw new DomainError('Quote already has an open Review Invite', 409, 'INVITE_ALREADY_OPEN');
    }
  }

  private async assertCanResend(bsaleDocumentId: number): Promise<void> {
    const reviewed = await this.deps.reviewStore.findReviewedInviteByDocumentId(bsaleDocumentId);
    if (reviewed) {
      throw new DomainError('Quote already has a Review', 409, 'QUOTE_ALREADY_REVIEWED');
    }
    const open = await this.deps.reviewStore.findOpenInviteByDocumentId(bsaleDocumentId);
    if (!open) {
      throw new DomainError('Quote has no open Review Invite to resend', 409, 'NO_OPEN_INVITE');
    }
  }
}

function resolveQuoteInviteStatus(
  openInvite: ReviewInviteRecord | null,
  hasReview: boolean,
  now: Date
): AdminInviteStatus {
  if (hasReview) return 'reviewed';
  if (!openInvite) return 'none';
  if (openInvite.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'open';
}

function inviteListStatus(
  invite: ReviewInviteRecord,
  now: Date
): 'open' | 'used' | 'expired' | 'revoked' {
  if (invite.revokedAt) return 'revoked';
  if (invite.usedAt) return 'used';
  if (invite.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'open';
}

function toAdminReview(
  review: ReviewRecord,
  productName: string,
  catalogType: CatalogType | null
): AdminReviewRow {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    displayName: review.displayName,
    productName,
    catalogType,
    visible: review.hiddenAt == null,
    createdAt: review.createdAt.toISOString()
  };
}
