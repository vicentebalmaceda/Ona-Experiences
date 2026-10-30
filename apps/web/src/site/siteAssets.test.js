import { describe, expect, it } from 'vitest';
import { defaultSiteAssets, mergePublished } from './SiteAssetsProvider.jsx';

describe('defaultSiteAssets', () => {
  it('bundles a default only for the logo; hero slots start empty', () => {
    const defaults = defaultSiteAssets();
    expect(defaults.logo.url).toBe('/assets/logo-ona.png');
    expect(defaults.hero.url).toBeNull();
    expect(defaults.hero_poster.url).toBeNull();
  });
});

describe('mergePublished', () => {
  it('falls back to bundled defaults when nothing is published', () => {
    expect(mergePublished(null)).toEqual(defaultSiteAssets());
    expect(mergePublished({ hero: null, logo: null, hero_poster: null })).toEqual(defaultSiteAssets());
  });

  it('overlays published slots and keeps defaults for the rest', () => {
    const merged = mergePublished({
      hero: { kind: 'video', url: 'https://blob/hero.mp4', alt: null, width: 1920, height: 1080 },
      logo: null
    });
    expect(merged.hero).toEqual({
      kind: 'video',
      url: 'https://blob/hero.mp4',
      alt: null,
      width: 1920,
      height: 1080,
      isDefault: false
    });
    expect(merged.logo.isDefault).toBe(true);
    expect(merged.hero_poster.isDefault).toBe(true);
  });

  it('ignores malformed entries', () => {
    const merged = mergePublished({ logo: { kind: 'image', url: '' }, hero: 'nope' });
    expect(merged.logo.isDefault).toBe(true);
    expect(merged.hero.isDefault).toBe(true);
  });
});
