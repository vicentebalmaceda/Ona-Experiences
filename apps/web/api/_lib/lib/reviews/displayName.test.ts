import { describe, expect, it } from 'vitest';
import { formatReviewDisplayName } from './displayName.js';

describe('formatReviewDisplayName', () => {
  it('uses first name and last initial', () => {
    expect(formatReviewDisplayName('María', 'González')).toBe('María G.');
  });

  it('keeps a single given name when there is no last name', () => {
    expect(formatReviewDisplayName('Ana', '')).toBe('Ana');
  });

  it('uppercases the last initial', () => {
    expect(formatReviewDisplayName('Juan', 'soto')).toBe('Juan S.');
  });
});
