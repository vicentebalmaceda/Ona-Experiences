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

export function renderStars(rating = 0) {
  if (rating == null || !Number.isFinite(Number(rating))) {
    return '☆☆☆☆☆';
  }
  const rounded = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => (index < rounded ? '★' : '☆')).join('');
}
