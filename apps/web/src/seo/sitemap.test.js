import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n/index.js';
import { matchRoute } from '../routes.js';
import { buildHead } from './buildHead.js';
import { buildSitemap } from './sitemap.js';

const SITE = 'https://www.onaexperiences.com';
const lodge = { type: 'Lodge', name: 'Río & Lago Lodge', productId: 7, zone: '3' };

function headFor(pathname, item) {
  const { pageId, lang, params } = matchRoute(pathname);
  return buildHead({ pageId, lang, params, item, t: createI18n(lang).getFixedT(lang) });
}

describe('buildSitemap', () => {
  const pages = [
    '/',
    '/en',
    '/quienes-somos',
    '/en/about',
    '/lodges/rio-lago-lodge-7',
    '/en/lodges/rio-lago-lodge-7',
    '/no-existe',
    '/review'
  ];
  const heads = pages.map(path => headFor(path, path.includes('lodges') ? lodge : undefined));
  // A duplicate (e.g. the same head twice) is listed once.
  const xml = buildSitemap([...heads, heads[0]], { lastmod: '2026-10-30' });

  it('lists indexable pages only, once each', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(locs).toEqual([
      `${SITE}/`,
      `${SITE}/en`,
      `${SITE}/quienes-somos`,
      `${SITE}/en/about`,
      `${SITE}/lodges/rio-lago-lodge-7`
    ]);
  });

  it('carries the same hreflang alternates as the page heads, and the build date', () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    const home = xml.split('<url>')[1];
    expect(home).toContain('<lastmod>2026-10-30</lastmod>');
    expect(home).toContain(`<xhtml:link rel="alternate" hreflang="es" href="${SITE}/" />`);
    expect(home).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE}/en" />`);
    expect(home).toContain(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />`);
    const lodgeEntry = xml.split('<url>')[5];
    expect(lodgeEntry).toContain(`hreflang="es" href="${SITE}/lodges/rio-lago-lodge-7"`);
    expect(lodgeEntry).not.toContain('hreflang="en"');
  });

  it('is well-formed XML with escaped values', () => {
    const special = buildSitemap(
      [{ canonical: `${SITE}/a?b=1&c=2`, robots: 'index, follow, max-image-preview:large', alternates: [] }],
      { lastmod: '2026-10-30' }
    );
    expect(special).toContain('<loc>https://www.onaexperiences.com/a?b=1&amp;c=2</loc>');
    expect(special.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(special.trim().endsWith('</urlset>')).toBe(true);
  });
});
