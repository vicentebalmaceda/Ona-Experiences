import { describe, expect, it, vi } from 'vitest';
import { MemoryQuoteStore } from '../lib/quotes/memoryQuoteStore.js';
import { MemoryReviewStore } from '../lib/reviews/memoryReviewStore.js';
import type { Mailer } from '../mailer/types.js';
import type { QuoteInviteResolver, ResolvedQuoteForInvite } from '../types/reviews.js';
import { AdminService } from './adminService.js';
import { ReviewService } from './reviewService.js';

const now = new Date('2026-09-24T18:00:00.000Z');

const resolvedQuote: ResolvedQuoteForInvite = {
  customer: { email: 'maria@example.com', firstName: 'María', lastName: 'González' },
  catalogType: 'lodge',
  bsaleProductId: 12,
  productName: 'Bio Bio Lodge',
  productActive: true,
  bsaleVariantId: 44
};

function createMailer(): Mailer {
  return {
    sendContactMessage: vi.fn().mockResolvedValue(undefined),
    sendQuoteNotification: vi.fn().mockResolvedValue(undefined),
    sendReviewInvite: vi.fn().mockResolvedValue(undefined),
    sendReviewThankYou: vi.fn().mockResolvedValue(undefined),
    sendReviewAdminNotification: vi.fn().mockResolvedValue(undefined)
  };
}

async function seedQuote(quoteStore: MemoryQuoteStore, reviewStore: MemoryReviewStore) {
  const product = await reviewStore.upsertProduct({
    catalogType: 'lodge',
    bsaleProductId: 12,
    name: 'Bio Bio Lodge',
    active: true
  });
  await quoteStore.upsertQuote({
    bsaleDocumentId: 6634,
    productId: product.id,
    email: 'maria@example.com',
    firstName: 'María',
    lastName: 'González',
    bsaleClientId: 9,
    bsaleVariantId: 44
  });
  return product;
}

function createAdmin() {
  const quoteStore = new MemoryQuoteStore();
  const reviewStore = new MemoryReviewStore();
  const reviewService = new ReviewService({
    store: reviewStore,
    quoteResolver: { resolve: vi.fn().mockResolvedValue(resolvedQuote) } as QuoteInviteResolver,
    mailer: createMailer(),
    publicAppUrl: 'https://ona.example',
    now: () => now,
    createToken: () => 'invite-token-admin-1'
  });
  const admin = new AdminService({
    quoteStore,
    reviewStore,
    reviewService,
    now: () => now
  });
  return { admin, quoteStore, reviewStore, reviewService };
}

describe('AdminService', () => {
  it('lists Quotes with send enabled when no open invite exists', async () => {
    const { admin, quoteStore, reviewStore } = createAdmin();
    await seedQuote(quoteStore, reviewStore);

    const [row] = await admin.listQuotes();
    expect(row).toMatchObject({
      bsaleDocumentId: 6634,
      canSend: true,
      canResend: false,
      inviteStatus: 'none',
      hasReview: false
    });
  });

  it('send then enables resend; resend revokes and reissues', async () => {
    const { admin, quoteStore, reviewStore } = createAdmin();
    await seedQuote(quoteStore, reviewStore);

    await admin.sendInvite(6634);
    let [row] = await admin.listQuotes();
    expect(row.canSend).toBe(false);
    expect(row.canResend).toBe(true);
    expect(row.inviteStatus).toBe('open');

    await expect(admin.sendInvite(6634)).rejects.toMatchObject({ code: 'INVITE_ALREADY_OPEN' });

    await admin.resendInvite(6634);
    const invites = [...reviewStore.invites.values()];
    expect(invites.filter((i) => i.revokedAt).length).toBe(1);
    expect(invites.filter((i) => !i.revokedAt).length).toBe(1);
  });

  it('lists invites and reviews for the admin panels', async () => {
    const { admin, quoteStore, reviewStore, reviewService } = createAdmin();
    await seedQuote(quoteStore, reviewStore);
    await admin.sendInvite(6634);
    await reviewService.submitReview(
      'invite-token-admin-1',
      5,
      'Una estadía excelente en el lodge, volveríamos sin dudar.'
    );

    const invites = await admin.listInvites();
    expect(invites[0]?.status).toBe('used');

    const reviews = await admin.listReviews();
    expect(reviews[0]).toMatchObject({ rating: 5, visible: true, displayName: 'María G.' });
  });
});
