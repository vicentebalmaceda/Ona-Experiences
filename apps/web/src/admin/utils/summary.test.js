import { describe, expect, it } from 'vitest';
import { summarizeAdminData, summarizeInvites, summarizeQuotes, summarizeReviews } from './summary.js';

const now = new Date('2026-10-06T12:00:00.000Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('summarizeQuotes', () => {
  it('buckets quotes by inviteStatus and counts the last 30 days', () => {
    const quotes = [
      { inviteStatus: 'none', hasReview: false, createdAt: daysAgo(1) },
      { inviteStatus: 'open', hasReview: false, createdAt: daysAgo(10) },
      { inviteStatus: 'reviewed', hasReview: true, createdAt: daysAgo(29) },
      { inviteStatus: 'expired', hasReview: false, createdAt: daysAgo(31) },
      { inviteStatus: 'expired', hasReview: false, createdAt: daysAgo(90) }
    ];
    expect(summarizeQuotes(quotes, { now })).toEqual({
      total: 5,
      recent: 3,
      byStatus: { none: 1, open: 1, reviewed: 1, expired: 2 }
    });
  });

  it('maps used/revoked/unknown statuses and trusts hasReview', () => {
    const quotes = [
      { inviteStatus: 'used', hasReview: false, createdAt: null },
      { inviteStatus: 'revoked', hasReview: false, createdAt: 'not-a-date' },
      { inviteStatus: 'open', hasReview: true, createdAt: daysAgo(2) },
      { inviteStatus: 'something-else', hasReview: false }
    ];
    expect(summarizeQuotes(quotes, { now })).toEqual({
      total: 4,
      recent: 1,
      byStatus: { none: 2, open: 0, reviewed: 2, expired: 0 }
    });
  });

  it('handles empty input', () => {
    expect(summarizeQuotes([], { now })).toEqual({
      total: 0,
      recent: 0,
      byStatus: { none: 0, open: 0, reviewed: 0, expired: 0 }
    });
  });
});

describe('summarizeInvites', () => {
  it('counts invites per status and ignores unknown ones', () => {
    const invites = [
      { status: 'open' },
      { status: 'open' },
      { status: 'used' },
      { status: 'expired' },
      { status: 'revoked' },
      { status: 'weird' }
    ];
    expect(summarizeInvites(invites)).toEqual({
      total: 6,
      recent: null,
      byStatus: { open: 2, used: 1, expired: 1, revoked: 1 }
    });
  });
});

describe('summarizeReviews', () => {
  it('splits visible vs hidden and averages ratings', () => {
    const reviews = [
      { rating: 5, visible: true, createdAt: daysAgo(3) },
      { rating: 4, visible: true, createdAt: daysAgo(40) },
      { rating: 1, visible: false, createdAt: daysAgo(5) },
      { rating: '3', visible: true, createdAt: daysAgo(0) }
    ];
    expect(summarizeReviews(reviews, { now })).toEqual({
      total: 4,
      recent: 3,
      visible: 3,
      hidden: 1,
      averageRating: 3.3,
      visibleAverageRating: 4
    });
  });

  it('returns null averages when there are no reviews', () => {
    expect(summarizeReviews([], { now })).toEqual({
      total: 0,
      recent: 0,
      visible: 0,
      hidden: 0,
      averageRating: null,
      visibleAverageRating: null
    });
  });

  it('ignores future createdAt in the recent count', () => {
    const reviews = [{ rating: 5, visible: true, createdAt: daysAgo(-2) }];
    expect(summarizeReviews(reviews, { now }).recent).toBe(0);
  });
});

describe('summarizeAdminData', () => {
  it('combines the three summaries and tolerates missing arrays', () => {
    const result = summarizeAdminData({ quotes: [{ inviteStatus: 'open', hasReview: false }] }, { now });
    expect(result.quotes.total).toBe(1);
    expect(result.invites.total).toBe(0);
    expect(result.reviews.total).toBe(0);
    expect(summarizeAdminData().quotes.total).toBe(0);
  });
});
