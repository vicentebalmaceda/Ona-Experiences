import { describe, expect, it } from 'vitest';
import { itemImageAlt } from './imageAlt.js';

const t = (key, values = {}) => {
  if (key.startsWith('zones.')) return `Zone ${key.slice(6)}`;
  return `${key}|${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(',')}`;
};

describe('itemImageAlt', () => {
  it('uses the translated zone label', () => {
    expect(itemImageAlt({ name: 'Lodge A', zone: '4' }, t)).toBe('common.item_image_alt|name=Lodge A,zone=Zone 4');
  });

  it('falls back when the item has no zone', () => {
    expect(itemImageAlt({ name: 'Guide B', zone: '' }, t)).toBe('common.item_image_alt_no_zone|name=Guide B');
  });
});
