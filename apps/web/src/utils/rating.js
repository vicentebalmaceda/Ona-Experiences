export function getRatingStats(item) {
  const reviews = Number(item?.reviews || 0);
  const raw = item?.rating;
  const average = reviews > 0 && raw != null && raw !== '' ? Number(raw) : null;
  return {
    average: Number.isFinite(average) ? average : null,
    reviews,
    userScore: null
  };
}

export function formatRating(average) {
  if (average == null || !Number.isFinite(Number(average))) {
    return '—';
  }
  return `${Number(average).toFixed(1)}/5.0`;
}

export function sortItemsByRating(items) {
  return [...(items || [])].sort((a, b) => {
    const statsA = getRatingStats(a);
    const statsB = getRatingStats(b);
    const averageA = statsA.average;
    const averageB = statsB.average;

    if (averageA == null && averageB == null) return 0;
    if (averageA == null) return 1;
    if (averageB == null) return -1;
    if (averageB !== averageA) return averageB - averageA;
    return statsB.reviews - statsA.reviews;
  });
}

export function renderStars(rating = 0) {
  if (rating == null || !Number.isFinite(Number(rating))) {
    return '☆☆☆☆☆';
  }
  const rounded = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => (index < rounded ? '★' : '☆')).join('');
}
