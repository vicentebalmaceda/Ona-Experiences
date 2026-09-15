import { describe, expect, it, vi } from 'vitest';
import { MemoryReviewStore } from '../lib/reviews/memoryReviewStore.js';
import type { Mailer } from '../mailer/types.js';
import type { QuoteInviteResolver, ResolvedQuoteForInvite } from '../types/reviews.js';
import { ReviewService, REVIEW_INVITE_TTL_MS } from './reviewService.js';

const now = new Date('2026-09-10T15:00:00.000Z');

const resolvedQuote: ResolvedQuoteForInvite = {
  customer: { email: 'Maria@Example.com', firstName: 'María', lastName: 'González' },
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

function createResolver(
  quote: ResolvedQuoteForInvite = resolvedQuote
): QuoteInviteResolver {
  return {
    resolve: vi.fn().mockResolvedValue(quote)
  };
}

function createService(overrides?: {
  mailer?: Mailer;
  quoteResolver?: QuoteInviteResolver;
  store?: MemoryReviewStore;
  now?: () => Date;
  createToken?: () => string;
}) {
  const mailer = overrides?.mailer ?? createMailer();
  const quoteResolver = overrides?.quoteResolver ?? createResolver();
  const store = overrides?.store ?? new MemoryReviewStore();
  const service = new ReviewService({
    store,
    quoteResolver,
    mailer,
    publicAppUrl: 'https://ona.example',
    now: overrides?.now ?? (() => now),
    createToken: overrides?.createToken ?? (() => 'invite-token-1')
  });
  return { service, mailer, quoteResolver, store };
}

const comment = 'Una estadía excelente en el lodge, volveríamos sin dudar.';

describe('ReviewService', () => {
  it('creates a Review Invite from a Quote id and emails the Customer', async () => {
    const { service, mailer, quoteResolver, store } = createService();

    const result = await service.createInvite({ bsaleDocumentId: 6634 });

    expect(quoteResolver.resolve).toHaveBeenCalledWith(6634);
    expect(result.expiresAt).toBe(new Date(now.getTime() + REVIEW_INVITE_TTL_MS).toISOString());
    expect(mailer.sendReviewInvite).toHaveBeenCalledWith({
      to: 'maria@example.com',
      firstName: 'María',
      productName: 'Bio Bio Lodge',
      reviewUrl: 'https://ona.example/review?token=invite-token-1',
      expiresAt: result.expiresAt
    });

    const product = await store.getProductByExternalKey('lodge', 12);
    expect(product).toMatchObject({ name: 'Bio Bio Lodge', active: true });
    const invite = [...store.invites.values()][0];
    expect(invite).toMatchObject({
      bsaleDocumentId: 6634,
      bsaleVariantId: 44,
      email: 'maria@example.com'
    });
  });

  it('upserts an inactive Product when the Quote product is inactive in BSale', async () => {
    const { service, store } = createService({
      quoteResolver: createResolver({ ...resolvedQuote, productActive: false })
    });

    await service.createInvite({ bsaleDocumentId: 6634 });

    const product = await store.getProductByExternalKey('lodge', 12);
    expect(product?.active).toBe(false);
  });

  it('revokes an unused Invite when another is issued for the same Quote', async () => {
    let token = 'first-token';
    const { service } = createService({
      createToken: () => token
    });

    await service.createInvite({ bsaleDocumentId: 6634 });
    token = 'second-token';
    await service.createInvite({ bsaleDocumentId: 6634 });

    await expect(service.previewInvite('first-token')).rejects.toMatchObject({
      code: 'INVITE_REVOKED',
      statusCode: 410
    });
    await expect(service.previewInvite('second-token')).resolves.toEqual({
      productName: 'Bio Bio Lodge',
      catalogType: 'lodge',
      expiresAt: new Date(now.getTime() + REVIEW_INVITE_TTL_MS).toISOString()
    });
  });

  it('rejects a new Invite when the Quote already has a Review', async () => {
    let token = 'used-token';
    const { service } = createService({ createToken: () => token });
    await service.createInvite({ bsaleDocumentId: 6634 });
    await service.submitReview('used-token', 5, comment);

    token = 'another-token';
    await expect(service.createInvite({ bsaleDocumentId: 6634 })).rejects.toMatchObject({
      code: 'QUOTE_ALREADY_REVIEWED',
      statusCode: 409
    });
  });

  it('accepts a redeemable invite as a visible Review and emails customer plus admin', async () => {
    const { service, mailer } = createService();
    await service.createInvite({ bsaleDocumentId: 6634 });

    const submitted = await service.submitReview('invite-token-1', 5, comment);

    expect(submitted.reviewId).toBeTruthy();
    expect(mailer.sendReviewThankYou).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'maria@example.com',
        rating: 5,
        comment,
        productName: 'Bio Bio Lodge'
      })
    );
    expect(mailer.sendReviewAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: submitted.reviewId, rating: 5 })
    );

    const view = await service.listVisibleForProduct('lodge', 12);
    expect(view.count).toBe(1);
    expect(view.average).toBe(5);
    expect(view.items).toEqual([
      expect.objectContaining({
        rating: 5,
        comment,
        displayName: 'María G.'
      })
    ]);
  });

  it('rejects a used, unknown, or too-short invite', async () => {
    let token = 'used-token';
    const store = new MemoryReviewStore();
    const { service } = createService({ createToken: () => token, store });
    await service.createInvite({ bsaleDocumentId: 6634 });
    await service.submitReview('used-token', 4, comment);

    await expect(service.submitReview('used-token', 5, comment)).rejects.toMatchObject({
      code: 'INVITE_USED',
      statusCode: 409
    });
    await expect(service.submitReview('unknown', 5, comment)).rejects.toMatchObject({
      code: 'INVITE_NOT_FOUND'
    });

    token = 'short-token';
    const other = createService({
      createToken: () => token,
      store,
      quoteResolver: createResolver({
        ...resolvedQuote,
        customer: { ...resolvedQuote.customer, email: 'otro@example.com' }
      })
    });
    await other.service.createInvite({ bsaleDocumentId: 9001 });
    await expect(other.service.submitReview('short-token', 5, 'muy corto')).rejects.toMatchObject({
      code: 'INVALID_COMMENT',
      statusCode: 400
    });
  });

  it('drops a hidden Review from the public average and list', async () => {
    const { service } = createService();
    await service.createInvite({ bsaleDocumentId: 6634 });
    const { reviewId } = await service.submitReview('invite-token-1', 2, comment);

    await service.setReviewHidden(reviewId, true);

    const view = await service.listVisibleForProduct('lodge', 12);
    expect(view).toEqual({ average: null, count: 0, items: [] });

    await service.setReviewHidden(reviewId, false);
    expect((await service.listVisibleForProduct('lodge', 12)).count).toBe(1);
  });

  it('keeps a saved Review when notification emails fail', async () => {
    const mailer = createMailer();
    mailer.sendReviewThankYou = vi.fn().mockRejectedValue(new Error('resend down'));
    const { service } = createService({ mailer });
    await service.createInvite({ bsaleDocumentId: 6634 });

    await expect(service.submitReview('invite-token-1', 5, comment)).resolves.toEqual({
      reviewId: expect.any(String)
    });
    expect((await service.listVisibleForProduct('lodge', 12)).count).toBe(1);
  });

  it('returns an empty view when the Product was never upserted', async () => {
    const { service } = createService();
    await expect(service.listVisibleForProduct('guide', 3)).resolves.toEqual({
      average: null,
      count: 0,
      items: []
    });
  });

  it('treats an expired unused invite as invalid', async () => {
    let current = now;
    const { service } = createService({ now: () => current });
    await service.createInvite({ bsaleDocumentId: 6634 });
    current = new Date(now.getTime() + REVIEW_INVITE_TTL_MS + 1);

    await expect(service.previewInvite('invite-token-1')).rejects.toMatchObject({
      code: 'INVITE_EXPIRED',
      statusCode: 410
    });
  });
});
