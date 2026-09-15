import { describe, expect, it } from 'vitest';
import { guideItemHandler, lodgeItemHandler } from './handlers/catalogItem.js';
import { guideListHandler, lodgeListHandler } from './handlers/catalogList.js';
import { guideReviewsHandler, lodgeReviewsHandler } from './handlers/catalogReviews.js';
import { guideSalesHandler, lodgeSalesHandler } from './handlers/catalogSales.js';
import { contactHandler } from './handlers/contact.js';
import { reviewInviteByTokenHandler } from './handlers/reviewInviteByToken.js';
import { reviewInvitesHandler } from './handlers/reviewInvites.js';
import { reviewByIdHandler } from './handlers/reviewById.js';
import { reviewsHandler } from './handlers/reviews.js';
import { matchV1Route, mergeV1Query, pathnameFromV1Request } from './v1Router.js';

describe('matchV1Route', () => {
  it('does not match an unknown v1 path', () => {
    expect(matchV1Route('/api/v1/unknown')).toBeNull();
  });

  it('matches /api/v1/lodges to the lodge list handler', () => {
    const match = matchV1Route('/api/v1/lodges');
    expect(match).not.toBeNull();
    expect(match?.handler).toBe(lodgeListHandler);
    expect(match?.params).toEqual({});
  });

  it('extracts productId for /api/v1/lodges/:productId', () => {
    const match = matchV1Route('/api/v1/lodges/65561');
    expect(match?.handler).toBe(lodgeItemHandler);
    expect(match?.params).toEqual({ productId: '65561' });
  });

  it.each([
    ['/api/v1/lodges/65561/reviews', lodgeReviewsHandler, { productId: '65561' }],
    ['/api/v1/lodges/65561/sales', lodgeSalesHandler, { productId: '65561' }],
    ['/api/v1/guides', guideListHandler, {}],
    ['/api/v1/guides/65562', guideItemHandler, { productId: '65562' }],
    ['/api/v1/guides/65562/reviews', guideReviewsHandler, { productId: '65562' }],
    ['/api/v1/guides/65562/sales', guideSalesHandler, { productId: '65562' }],
    ['/api/v1/contact', contactHandler, {}],
    ['/api/v1/reviews', reviewsHandler, {}],
    ['/api/v1/reviews/11111111-1111-1111-1111-111111111111', reviewByIdHandler, {
      reviewId: '11111111-1111-1111-1111-111111111111'
    }],
    ['/api/v1/review-invites', reviewInvitesHandler, {}],
    ['/api/v1/review-invites/invite-token-16chars', reviewInviteByTokenHandler, {
      token: 'invite-token-16chars'
    }]
  ] as const)('dispatches %s', (pathname, handler, params) => {
    const match = matchV1Route(pathname);
    expect(match?.handler).toBe(handler);
    expect(match?.params).toEqual(params);
  });
});

describe('pathnameFromV1Request', () => {
  it('keeps nested paths from req.url after a rewrite to /api/v1', () => {
    expect(pathnameFromV1Request('/api/v1/lodges/2018')).toBe('/api/v1/lodges/2018');
    expect(pathnameFromV1Request('/api/v1/lodges/2018/reviews?x=1')).toBe(
      '/api/v1/lodges/2018/reviews'
    );
  });

  it('rebuilds nested paths from path query when url is only /api/v1', () => {
    expect(pathnameFromV1Request('/api/v1', 'lodges/2018')).toBe('/api/v1/lodges/2018');
    expect(pathnameFromV1Request('/api/v1', ['lodges', '2018', 'reviews'])).toBe(
      '/api/v1/lodges/2018/reviews'
    );
  });
});

describe('mergeV1Query', () => {
  it('writes named params and drops the catch-all path segment', () => {
    expect(
      mergeV1Query({ path: ['lodges', '65561', 'sales'], limit: '10' }, { productId: '65561' })
    ).toEqual({ limit: '10', productId: '65561' });
  });
});
