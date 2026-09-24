import { describe, expect, it } from 'vitest';
import { formatRating, sortItemsByRating } from './rating.js';

describe('formatRating', () => {
  it('formats a score as X/5.0', () => {
    expect(formatRating(4.8)).toBe('4.8/5.0');
  });

  it('pads whole numbers to one decimal', () => {
    expect(formatRating(5)).toBe('5.0/5.0');
  });

  it('returns an em dash when there is no average', () => {
    expect(formatRating(null)).toBe('—');
    expect(formatRating(undefined)).toBe('—');
    expect(formatRating(Number.NaN)).toBe('—');
  });
});

describe('sortItemsByRating', () => {
  it('orders rated items highest first and unrated last', () => {
    const items = [
      { name: 'B', rating: 4.2, reviews: 3 },
      { name: 'C', rating: null, reviews: 0 },
      { name: 'A', rating: 4.9, reviews: 10 }
    ];

    expect(sortItemsByRating(items).map((item) => item.name)).toEqual(['A', 'B', 'C']);
  });

  it('breaks rating ties with more reviews first', () => {
    const items = [
      { name: 'Few', rating: 4.5, reviews: 2 },
      { name: 'Many', rating: 4.5, reviews: 20 }
    ];

    expect(sortItemsByRating(items).map((item) => item.name)).toEqual(['Many', 'Few']);
  });

  it('does not mutate the input array', () => {
    const items = [
      { name: 'B', rating: 4.0, reviews: 1 },
      { name: 'A', rating: 5.0, reviews: 1 }
    ];
    const copy = [...items];

    sortItemsByRating(items);
    expect(items).toEqual(copy);
  });
});
