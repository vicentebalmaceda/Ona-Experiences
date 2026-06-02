export function getInitialRating(item) {
  return {
    average: Number(item.rating || 4.8),
    reviews: Number(item.reviews || 0),
    userScore: null
  };
}
export function ratingKey(item) {
  return `ona-rating:${item.type}:${item.name}`;
}
export function getStoredRating(item) {
  try {
    return JSON.parse(localStorage.getItem(ratingKey(item))) || null;
  } catch {
    return null;
  }
}
export function getRatingStats(item, ratingVersion = 0) {
  void ratingVersion;
  const stored = getStoredRating(item);
  if (!stored) return getInitialRating(item);

  return {
    average: Number(stored.average || item.rating || 4.8),
    reviews: Number(stored.reviews || item.reviews || 0),
    userScore: Number(stored.userScore || 0)
  };
}
export function saveUserRating(item, userScore) {
  const key = ratingKey(item);
  const previous = getStoredRating(item);
  const previousScore = previous && previous.userScore ? Number(previous.userScore) : null;
  const currentAverage = previous ? Number(previous.average) : Number(item.rating || 4.8);
  const currentReviews = previous ? Number(previous.reviews) : Number(item.reviews || 0);

  let nextReviews = currentReviews;
  let nextAverage = currentAverage;

  if (previousScore) {
    nextAverage = ((currentAverage * currentReviews) - previousScore + userScore) / Math.max(currentReviews, 1);
  } else {
    nextReviews = currentReviews + 1;
    nextAverage = ((currentAverage * currentReviews) + userScore) / nextReviews;
  }

  localStorage.setItem(key, JSON.stringify({
    average: Number(nextAverage.toFixed(1)),
    reviews: nextReviews,
    userScore
  }));
}
export function renderStars(rating = 0) {
  const rounded = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => index < rounded ? '★' : '☆').join('');
}
