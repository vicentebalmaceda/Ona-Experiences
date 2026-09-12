import { describe, expect, it, vi } from 'vitest';
import { MemoryReviewStore } from '../lib/reviews/memoryReviewStore.js';
import type { Mailer } from '../mailer/types.js';
import type { CatalogProductLookup } from '../types/reviews.js';
import { ReviewService, REVIEW_INVITE_TTL_MS } from './reviewService.js';

const now = new Date('2026-09-10T15:00:00.000Z');

function createMailer(): Mailer {
  return {
    sendContactMessage: vi.fn().mockResolvedValue(undefined),
    sendQuoteNotification: vi.fn().mockResolvedValue(undefined),
    sendReviewInvite: vi.fn().mockResolvedValue(undefined),
    sendReviewThankYou: vi.fn().mockResolvedValue(undefined),
    sendReviewAdminNotification: vi.fn().mockResolvedValue(undefined)
  };
}

function createCatalog(): CatalogProductLookup {
  return {
    get: vi.fn().mockResolvedValue({ productId: 12, productName: 'Bio Bio Lodge' })
  };
}

function createService(overrides?: {
  mailer?: Mailer;
  catalog?: CatalogProductLookup;
  store?: MemoryReviewStore;
  now?: () => Date;
  createToken?: () => string;
}) {
  const mailer = overrides?.mailer ?? createMailer();
  const catalog = overrides?.catalog ?? createCatalog();
  const store = overrides?.store ?? new MemoryReviewStore();
  const service = new ReviewService({
    store,
    catalog,
    mailer,
    publicAppUrl: 'https://ona.example',
    now: overrides?.now ?? (() => now),
    createToken: overrides?.createToken ?? (() => 'invite-token-1')
  });
  return { service, mailer, catalog, store };
}

const customer = { email: 'Maria@Example.com', firstName: 'María', lastName: 'González' };
const comment = 'Una estadía excelente en el lodge, volveríamos sin dudar.';

describe('ReviewService', () => {
  it('upserts a Product from BSale and emails a 30-day invite', async () => {
    const { service, mailer, catalog } = createService();

    const result = await service.createInvite({
      catalogType: 'lodge',
      bsaleProductId: 12,
      customer,
      bsaleDocumentId: 99
    });

    expect(catalog.get).toHaveBeenCalledWith('lodge', 12);
    expect(result.expiresAt).toBe(new Date(now.getTime() + REVIEW_INVITE_TTL_MS).toISOString());
    expect(mailer.sendReviewInvite).toHaveBeenCalledWith({
      to: 'maria@example.com',
      firstName: 'María',
      productName: 'Bio Bio Lodge',
      reviewUrl: 'https://ona.example/review?token=invite-token-1',
      expiresAt: result.expiresAt
    });
  });

  it('revokes an unused invite when another is sent for the same Customer and Product', async () => {
    let token = 'first-token';
    const { service } = createService({
      createToken: () => token
    });

    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });
    token = 'second-token';
    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });

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

  it('accepts a redeemable invite as a visible Review and emails customer plus admin', async () => {
    const { service, mailer } = createService();
    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });

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
    const { service } = createService({ createToken: () => token });
    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });
    await service.submitReview('used-token', 4, comment);

    await expect(service.submitReview('used-token', 5, comment)).rejects.toMatchObject({
      code: 'INVITE_USED',
      statusCode: 409
    });
    await expect(service.submitReview('unknown', 5, comment)).rejects.toMatchObject({
      code: 'INVITE_NOT_FOUND'
    });

    token = 'short-token';
    await service.createInvite({
      catalogType: 'lodge',
      bsaleProductId: 12,
      customer: { ...customer, email: 'otro@example.com' }
    });
    await expect(service.submitReview('short-token', 5, 'muy corto')).rejects.toMatchObject({
      code: 'INVALID_COMMENT',
      statusCode: 400
    });
  });

  it('drops a hidden Review from the public average and list', async () => {
    const { service } = createService();
    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });
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
    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });

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
    await service.createInvite({ catalogType: 'lodge', bsaleProductId: 12, customer });
    current = new Date(now.getTime() + REVIEW_INVITE_TTL_MS + 1);

    await expect(service.previewInvite('invite-token-1')).rejects.toMatchObject({
      code: 'INVITE_EXPIRED',
      statusCode: 410
    });
  });
});
