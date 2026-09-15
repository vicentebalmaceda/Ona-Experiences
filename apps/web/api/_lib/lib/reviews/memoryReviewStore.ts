import { randomUUID } from 'node:crypto';
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

const EMPTY_AGGREGATE: ReviewAggregate = { average: null, count: 0 };

export class MemoryReviewStore implements ReviewStore {
  readonly products = new Map<string, ProductRecord>();
  readonly invites = new Map<string, ReviewInviteRecord>();
  readonly reviews = new Map<string, ReviewRecord>();

  async upsertProduct(input: UpsertProductInput): Promise<ProductRecord> {
    const active = input.active ?? true;
    const existing = [...this.products.values()].find(
      (product) =>
        product.catalogType === input.catalogType && product.bsaleProductId === input.bsaleProductId
    );
    if (existing) {
      const updated = { ...existing, name: input.name, active };
      this.products.set(existing.id, updated);
      return updated;
    }

    const created: ProductRecord = {
      id: randomUUID(),
      catalogType: input.catalogType,
      bsaleProductId: input.bsaleProductId,
      name: input.name,
      active
    };
    this.products.set(created.id, created);
    return created;
  }

  async getProductById(id: string): Promise<ProductRecord | null> {
    return this.products.get(id) ?? null;
  }

  async getProductByExternalKey(
    catalogType: CatalogType,
    bsaleProductId: number
  ): Promise<ProductRecord | null> {
    return (
      [...this.products.values()].find(
        (product) => product.catalogType === catalogType && product.bsaleProductId === bsaleProductId
      ) ?? null
    );
  }

  async findReviewedInviteByDocumentId(bsaleDocumentId: number): Promise<ReviewInviteRecord | null> {
    for (const invite of this.invites.values()) {
      if (invite.bsaleDocumentId !== bsaleDocumentId) continue;
      const hasReview = [...this.reviews.values()].some((review) => review.inviteId === invite.id);
      if (hasReview) return invite;
    }
    return null;
  }

  async revokeUnusedInvitesForDocument(bsaleDocumentId: number, revokedAt: Date): Promise<void> {
    for (const invite of this.invites.values()) {
      if (
        invite.bsaleDocumentId === bsaleDocumentId &&
        invite.usedAt == null &&
        invite.revokedAt == null
      ) {
        this.invites.set(invite.id, { ...invite, revokedAt });
      }
    }
  }

  async createInvite(input: CreateInviteInput): Promise<ReviewInviteRecord> {
    const created: ReviewInviteRecord = {
      id: randomUUID(),
      ...input,
      usedAt: null,
      revokedAt: null
    };
    this.invites.set(created.id, created);
    return created;
  }

  async findInviteByTokenHash(tokenHash: string): Promise<ReviewInviteRecord | null> {
    return [...this.invites.values()].find((invite) => invite.tokenHash === tokenHash) ?? null;
  }

  async markInviteUsed(inviteId: string, usedAt: Date): Promise<void> {
    const invite = this.invites.get(inviteId);
    if (!invite) return;
    this.invites.set(inviteId, { ...invite, usedAt });
  }

  async createReview(input: CreateReviewInput): Promise<ReviewRecord> {
    const created: ReviewRecord = {
      id: randomUUID(),
      ...input,
      hiddenAt: null
    };
    this.reviews.set(created.id, created);
    return created;
  }

  async getReviewById(id: string): Promise<ReviewRecord | null> {
    return this.reviews.get(id) ?? null;
  }

  async setReviewHidden(id: string, hiddenAt: Date | null): Promise<ReviewRecord> {
    const review = this.reviews.get(id);
    if (!review) {
      throw new Error(`Review not found: ${id}`);
    }
    const updated = { ...review, hiddenAt };
    this.reviews.set(id, updated);
    return updated;
  }

  async listVisibleReviews(productId: string, limit: number): Promise<ReviewRecord[]> {
    return [...this.reviews.values()]
      .filter((review) => review.productId === productId && review.hiddenAt == null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getVisibleAggregate(productId: string): Promise<ReviewAggregate> {
    const visible = [...this.reviews.values()].filter(
      (review) => review.productId === productId && review.hiddenAt == null
    );
    return toAggregate(visible);
  }

  async getVisibleAggregatesByExternalKeys(
    keys: Array<{ catalogType: CatalogType; bsaleProductId: number }>
  ): Promise<Map<string, ReviewAggregate>> {
    const result = new Map<string, ReviewAggregate>();
    for (const key of keys) {
      const product = await this.getProductByExternalKey(key.catalogType, key.bsaleProductId);
      result.set(
        reviewAggregateKey(key.catalogType, key.bsaleProductId),
        product ? await this.getVisibleAggregate(product.id) : EMPTY_AGGREGATE
      );
    }
    return result;
  }
}

function toAggregate(reviews: ReviewRecord[]): ReviewAggregate {
  if (reviews.length === 0) return EMPTY_AGGREGATE;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return {
    average: Number((sum / reviews.length).toFixed(1)),
    count: reviews.length
  };
}
