import { describe, expect, it } from 'vitest';
import { imageUrl, responsiveImage } from './responsiveImage.js';

describe('imageUrl', () => {
  it('makes catalog paths root-relative', () => {
    expect(imageUrl('assets/lodges/a.jpg')).toBe('/assets/lodges/a.jpg');
    expect(imageUrl('/assets/lodges/a.jpg')).toBe('/assets/lodges/a.jpg');
  });

  it('leaves absolute URLs and empty values alone', () => {
    expect(imageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(imageUrl('')).toBe('');
    expect(imageUrl(undefined)).toBe('');
  });
});

describe('responsiveImage', () => {
  it('points bundled photos at the WebP variants', () => {
    expect(responsiveImage('assets/lodges/bio-bio-lodge-1.jpg', '50vw')).toEqual({
      src: '/assets/lodges/bio-bio-lodge-1.jpg',
      srcSet:
        '/assets/_img/lodges/bio-bio-lodge-1-480.webp 480w, /assets/_img/lodges/bio-bio-lodge-1-960.webp 960w, /assets/_img/lodges/bio-bio-lodge-1-1600.webp 1600w',
      sizes: '50vw'
    });
    expect(responsiveImage('/assets/guides/x.jpeg').srcSet).toContain('/assets/_img/guides/x-480.webp');
    expect(responsiveImage('assets/about/y.webp').srcSet).toContain('/assets/_img/about/y-1600.webp');
  });

  it('returns only src for other URLs', () => {
    expect(responsiveImage('https://store.public.blob.vercel-storage.com/h.jpg')).toEqual({
      src: 'https://store.public.blob.vercel-storage.com/h.jpg'
    });
    expect(responsiveImage('/assets/logo-ona.png')).toEqual({ src: '/assets/logo-ona.png' });
  });
});
