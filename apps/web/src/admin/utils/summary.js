// Pure, client-side aggregation for the admin "Resumen" page.
// Works on the AdminQuoteRow / AdminInviteRow / AdminReviewRow arrays that
// AdminApp already loads; no fetching happens here.

export const RECENT_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// AdminQuoteRow.inviteStatus -> dashboard bucket.
// The API only produces none | open | expired | reviewed for quotes, but the
// type also allows used | revoked, so those are mapped to their closest
// domain meaning instead of being dropped.
const QUOTE_STATUS_BUCKET = {
  none: 'none', // sin invitación
  open: 'open', // invitación abierta
  reviewed: 'reviewed', // ya tiene reseña
  used: 'reviewed', // invitación usada == reseña enviada
  expired: 'expired', // invitación expirada
  revoked: 'none' // sin invitación vigente
};

function toTime(value) {
  if (!value) return NaN;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? NaN : time;
}

function isRecent(value, nowMs, windowDays) {
  const time = toTime(value);
  if (Number.isNaN(time)) return false;
  return time <= nowMs && nowMs - time <= windowDays * DAY_MS;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function average(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return round1(sum / values.length);
}

export function summarizeQuotes(quotes = [], { now = Date.now(), windowDays = RECENT_WINDOW_DAYS } = {}) {
  const nowMs = typeof now === 'number' ? now : new Date(now).getTime();
  const byStatus = { none: 0, open: 0, reviewed: 0, expired: 0 };
  let recent = 0;
  for (const quote of quotes) {
    const bucket = quote.hasReview ? 'reviewed' : QUOTE_STATUS_BUCKET[quote.inviteStatus] || 'none';
    byStatus[bucket] += 1;
    if (isRecent(quote.createdAt, nowMs, windowDays)) recent += 1;
  }
  return { total: quotes.length, recent, byStatus };
}

export function summarizeInvites(invites = []) {
  const byStatus = { open: 0, used: 0, expired: 0, revoked: 0 };
  for (const invite of invites) {
    if (invite.status in byStatus) byStatus[invite.status] += 1;
  }
  // AdminInviteRow has no createdAt, so no "últimos 30 días" figure here.
  return { total: invites.length, recent: null, byStatus };
}

export function summarizeReviews(reviews = [], { now = Date.now(), windowDays = RECENT_WINDOW_DAYS } = {}) {
  const nowMs = typeof now === 'number' ? now : new Date(now).getTime();
  let visible = 0;
  let recent = 0;
  const ratings = [];
  const visibleRatings = [];
  for (const review of reviews) {
    const rating = Number(review.rating);
    if (Number.isFinite(rating)) {
      ratings.push(rating);
      if (review.visible) visibleRatings.push(rating);
    }
    if (review.visible) visible += 1;
    if (isRecent(review.createdAt, nowMs, windowDays)) recent += 1;
  }
  return {
    total: reviews.length,
    recent,
    visible,
    hidden: reviews.length - visible,
    averageRating: average(ratings),
    visibleAverageRating: average(visibleRatings)
  };
}

export function summarizeAdminData({ quotes = [], invites = [], reviews = [] } = {}, options = {}) {
  return {
    quotes: summarizeQuotes(quotes, options),
    invites: summarizeInvites(invites),
    reviews: summarizeReviews(reviews, options)
  };
}
