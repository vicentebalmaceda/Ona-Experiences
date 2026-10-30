import { describe, expect, it } from 'vitest';
import { LANDING_FIELDS, landingItem, landingList, sameData } from './pageData.js';
import { lodgeApiItem } from '../test/fixtures.js';

describe('landingItem', () => {
  it('keeps only the fields the landing renders (no description, gallery or price)', () => {
    const item = landingItem({ ...lodgeApiItem, description: 'x'.repeat(15000) });
    expect(Object.keys(item).sort()).toEqual([...LANDING_FIELDS].sort());
    expect(item).not.toHaveProperty('description');
    expect(item).not.toHaveProperty('gallery');
    expect(item).not.toHaveProperty('referencePrice');
    expect(item.name).toBe('Bio Bio Lodge');
  });

  it('leaves absent fields absent', () => {
    expect(landingItem({ productId: 1, name: 'A' })).toEqual({ productId: 1, name: 'A' });
    expect(landingList(undefined)).toEqual([]);
  });

  it('compares revalidated lists on landing fields only: a changed description is not a change', () => {
    const embedded = landingList([lodgeApiItem]);
    const refetched = landingList([{ ...lodgeApiItem, description: '<p>Nueva descripción</p>' }]);
    expect(sameData(embedded, refetched)).toBe(true);
    expect(sameData(embedded, landingList([{ ...lodgeApiItem, name: 'Otro' }]))).toBe(false);
  });
});
