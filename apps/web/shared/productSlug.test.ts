import { describe, expect, it } from 'vitest';
import { parseProductSlug, productSlug, slugify } from './productSlug.js';

describe('slugify', () => {
  it('lowercases and dashes words', () => {
    expect(slugify('Bio Bio River Lodge')).toBe('bio-bio-river-lodge');
  });

  it('strips accents and turns ñ into n', () => {
    expect(slugify('Lodge Ñirehuao – Río Cisnes')).toBe('lodge-nirehuao-rio-cisnes');
    expect(slugify('Guía Ünico Árbol')).toBe('guia-unico-arbol');
  });

  it('collapses non-alphanumerics and trims dashes', () => {
    expect(slugify('  ¡Matapiojo & Co.!  ')).toBe('matapiojo-co');
    expect(slugify('A---B__C')).toBe('a-b-c');
  });

  it('handles empty input', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});

describe('productSlug', () => {
  it('joins the slugified name and the productId', () => {
    expect(productSlug({ name: 'Bio Bio River Lodge', productId: 2007 })).toBe('bio-bio-river-lodge-2007');
    expect(productSlug({ name: 'Las Ardillas', productId: '65561' })).toBe('las-ardillas-65561');
  });

  it('falls back to the bare id when the name is empty', () => {
    expect(productSlug({ name: '', productId: 2007 })).toBe('2007');
    expect(productSlug({ productId: 2007 })).toBe('2007');
  });

  it('returns null without a productId', () => {
    expect(productSlug({ name: 'Seed only' })).toBeNull();
    expect(productSlug(null)).toBeNull();
  });

  it('round-trips through parseProductSlug, even for names ending in digits', () => {
    const slug = productSlug({ name: 'Lodge 42', productId: 2007 });
    expect(slug).toBe('lodge-42-2007');
    expect(parseProductSlug(slug)).toBe('2007');
  });
});

describe('parseProductSlug', () => {
  it('reads the trailing id', () => {
    expect(parseProductSlug('bio-bio-river-lodge-2007')).toBe('2007');
  });

  it('accepts a bare id (old URLs)', () => {
    expect(parseProductSlug('2007')).toBe('2007');
  });

  it('returns null when there is no id', () => {
    expect(parseProductSlug('bio-bio-river-lodge')).toBeNull();
    expect(parseProductSlug('')).toBeNull();
    expect(parseProductSlug(undefined)).toBeNull();
  });
});
