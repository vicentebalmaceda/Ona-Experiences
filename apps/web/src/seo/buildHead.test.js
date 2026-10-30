import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n/index.js';
import { matchRoute } from '../routes.js';
import { buildHead, excerptFromHtml, renderHeadTags } from './buildHead.js';

const SITE = 'https://www.onaexperiences.com';

/** buildHead the way a server render would: from the request path. */
function headFor(pathname, item, extra = {}) {
  const { pageId, lang, params } = matchRoute(pathname);
  const i18n = createI18n(lang);
  return buildHead({ pageId, lang, params, item, t: i18n.getFixedT(lang), ...extra });
}

function metaContent(head, key) {
  return head.meta.find(entry => entry.property === key || entry.name === key)?.content;
}

const lodge = {
  type: 'Lodge',
  name: 'Bio Bio River Lodge',
  productId: 2007,
  zone: '2',
  description:
    '<p>Ubicado a orillas del r&iacute;o Biob&iacute;o, el lodge ofrece pesca con mosca de truchas arco&iacute;ris y caf&eacute;s en un entorno &uacute;nico &amp; tranquilo, con gu&iacute;as biling&uuml;es, botes y vadeo en m&aacute;s de veinte kil&oacute;metros de r&iacute;o privado.</p><p>Temporada de noviembre a abril.</p>'
};

describe('buildHead', () => {
  it('es home: indexable, canonical /, full es/en/x-default alternates', () => {
    const head = headFor('/');
    expect(head).toMatchObject({
      title: 'Lodges y guías de pesca con mosca en Chile y la Patagonia | ONA Experiences',
      description: expect.stringContaining('Encuentra lodges y guías'),
      canonical: `${SITE}/`,
      alternates: [
        { hreflang: 'es', href: `${SITE}/` },
        { hreflang: 'en', href: `${SITE}/en` },
        { hreflang: 'x-default', href: `${SITE}/` }
      ],
      robots: 'index, follow, max-image-preview:large',
      htmlLang: 'es'
    });
  });

  it('en home: English texts, canonical /en, same alternates', () => {
    const head = headFor('/en');
    expect(head.title).toBe('Fly Fishing Lodges & Guides in Chile and Patagonia | ONA Experiences');
    expect(head.canonical).toBe(`${SITE}/en`);
    expect(head.htmlLang).toBe('en');
    expect(head.robots).toMatch(/^index/);
    expect(head.alternates.map(a => a.hreflang)).toEqual(['es', 'en', 'x-default']);
  });

  it('about pages pair across languages', () => {
    const head = headFor('/en/about');
    expect(head.canonical).toBe(`${SITE}/en/about`);
    expect(head.alternates).toContainEqual({ hreflang: 'es', href: `${SITE}/quienes-somos` });
  });

  it('es lodge: item title, excerpt description, canonical to the current slug, es + x-default only', () => {
    const head = headFor('/lodges/2007', lodge);
    expect(head.title).toBe('Bio Bio River Lodge – Lodge de pesca con mosca en Araucanía | ONA Experiences');
    expect(head.description.startsWith('Ubicado a orillas del río Biobío')).toBe(true);
    expect(head.description).toContain('entorno único & tranquilo');
    expect(head.description).not.toMatch(/[<>]|&\w+;/);
    expect(head.description.length).toBeLessThanOrEqual(155);
    expect(head.description.endsWith('…')).toBe(true);
    expect(head.canonical).toBe(`${SITE}/lodges/bio-bio-river-lodge-2007`);
    expect(head.alternates).toEqual([
      { hreflang: 'es', href: `${SITE}/lodges/bio-bio-river-lodge-2007` },
      { hreflang: 'x-default', href: `${SITE}/lodges/bio-bio-river-lodge-2007` }
    ]);
    expect(head.robots).toMatch(/^index/);
  });

  it('es lodge without a usable description falls back to the template', () => {
    const head = headFor('/lodges/bio-bio-river-lodge-2007', { ...lodge, description: '<p>Corto.</p>' });
    expect(head.description).toBe(
      'Bio Bio River Lodge: lodge de pesca con mosca en Araucanía. Revisa fotos, ubicación y reseñas de pescadores, y pide disponibilidad con ONA Experiences.'
    );
  });

  it('es guide while loading uses a generic title and the URL slug', () => {
    const head = headFor('/guides/juan-perez-12');
    expect(head.title).toBe('Guía de pesca con mosca en Chile | ONA Experiences');
    expect(head.canonical).toBe(`${SITE}/guides/juan-perez-12`);
  });

  it('en lodge: noindex, follow with no canonical or hreflang pairing', () => {
    const head = headFor('/en/lodges/bio-bio-river-lodge-2007', lodge);
    expect(head.title).toBe('Bio Bio River Lodge – Fly Fishing Lodge in Araucanía | ONA Experiences');
    expect(head.robots).toBe('noindex, follow');
    expect(head.canonical).toBeNull();
    expect(head.alternates).toEqual([]);
    expect(head.htmlLang).toBe('en');
  });

  it('review: noindex, no canonical', () => {
    const head = headFor('/review');
    expect(head.title).toBe('Deja tu reseña | ONA Experiences');
    expect(head.robots).toBe('noindex, nofollow');
    expect(head.canonical).toBeNull();
    expect(head.alternates).toEqual([]);
  });

  it('admin and unknown pages: noindex', () => {
    expect(headFor('/admin/x').robots).toBe('noindex, nofollow');
    const notFound = headFor('/en/nothing');
    expect(notFound.title).toBe('Page not found | ONA Experiences');
    expect(notFound.robots).toBe('noindex, follow');
    expect(notFound.htmlLang).toBe('en');
    expect(notFound.alternates).toEqual([]);
  });
});

describe('buildHead social tags and structured data', () => {
  const detailed = {
    ...lodge,
    lat: -38.4,
    lng: -71.2,
    image: 'assets/lodges/a.jpg',
    gallery: ['assets/lodges/a.jpg', 'https://cdn.example.com/b.jpg'],
    rating: null,
    reviews: 0
  };

  it('home: Open Graph / Twitter tags with the hero image, preload, Organization + WebSite + ItemList', () => {
    const head = headFor('/', undefined, {
      heroImage: 'https://blob.example.com/poster.jpg',
      logoUrl: '/assets/logo-ona.png',
      lodges: [{ ...lodge, type: 'Lodge' }, { name: 'Sin id', type: 'Lodge' }]
    });
    expect(metaContent(head, 'og:type')).toBe('website');
    expect(metaContent(head, 'og:site_name')).toBe('ONA Experiences');
    expect(metaContent(head, 'og:url')).toBe(`${SITE}/`);
    expect(metaContent(head, 'og:image')).toBe('https://blob.example.com/poster.jpg');
    expect(metaContent(head, 'og:locale')).toBe('es_CL');
    expect(metaContent(head, 'og:locale:alternate')).toBe('en_US');
    expect(metaContent(head, 'twitter:card')).toBe('summary_large_image');
    expect(head.preloads).toEqual([{ href: 'https://blob.example.com/poster.jpg', as: 'image', fetchpriority: 'high' }]);

    const [organization, website, itemList] = head.jsonLd;
    expect(organization).toMatchObject({
      '@type': 'Organization',
      url: `${SITE}/`,
      logo: `${SITE}/assets/logo-ona.png`,
      sameAs: expect.arrayContaining(['https://www.onaflyfishing.cl'])
    });
    expect(website).toMatchObject({ '@type': 'WebSite', alternateName: 'ONA', inLanguage: 'es' });
    expect(itemList.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, url: `${SITE}/lodges/bio-bio-river-lodge-2007`, name: 'Bio Bio River Lodge' }
    ]);
  });

  it('home without a published hero: bundled landscape og:image and no preload', () => {
    const head = headFor('/en');
    expect(metaContent(head, 'og:image')).toBe(`${SITE}/assets/lodges/manihuales-eco-lodge-5.jpg`);
    expect(metaContent(head, 'og:locale')).toBe('en_US');
    expect(head.preloads).toEqual([]);
    expect(head.jsonLd[1].inLanguage).toBe('en');
  });

  it('es lodge: LodgingBusiness with geo, region, images and breadcrumbs; no aggregateRating without reviews', () => {
    const head = headFor('/lodges/bio-bio-river-lodge-2007', detailed, { reviews: { average: null, count: 0, items: [] } });
    expect(metaContent(head, 'og:image')).toBe(`${SITE}/assets/lodges/a.jpg`);
    expect(metaContent(head, 'og:url')).toBe(`${SITE}/lodges/bio-bio-river-lodge-2007`);
    const [business, breadcrumbs] = head.jsonLd;
    expect(business).toMatchObject({
      '@type': 'LodgingBusiness',
      name: 'Bio Bio River Lodge',
      url: `${SITE}/lodges/bio-bio-river-lodge-2007`,
      image: [`${SITE}/assets/lodges/a.jpg`, 'https://cdn.example.com/b.jpg'],
      geo: { '@type': 'GeoCoordinates', latitude: -38.4, longitude: -71.2 },
      address: { '@type': 'PostalAddress', addressRegion: 'Araucanía', addressCountry: 'CL' }
    });
    expect(business.description.startsWith('Ubicado a orillas del río Biobío')).toBe(true);
    expect(business).not.toHaveProperty('aggregateRating');
    expect(breadcrumbs['@type']).toBe('BreadcrumbList');
    expect(breadcrumbs.itemListElement.map(entry => entry.item)).toEqual([
      `${SITE}/`,
      `${SITE}/lodges/bio-bio-river-lodge-2007`
    ]);
  });

  it('es lodge with visible reviews: aggregateRating from the review view', () => {
    const head = headFor('/lodges/bio-bio-river-lodge-2007', detailed, { reviews: { average: 4.666, count: 3, items: [] } });
    expect(head.jsonLd[0].aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.7,
      reviewCount: 3,
      bestRating: 5,
      worstRating: 1
    });
  });

  it('guide: LocalBusiness', () => {
    const head = headFor('/guides/juan-perez-12', { ...detailed, type: 'Guía', name: 'Juan Pérez', productId: 12 });
    expect(head.jsonLd.map(block => block['@type'])).toEqual(['LocalBusiness', 'BreadcrumbList']);
  });

  it('no JSON-LD on noindex pages', () => {
    expect(headFor('/en/lodges/bio-bio-river-lodge-2007', detailed).jsonLd).toEqual([]);
    expect(headFor('/review').jsonLd).toEqual([]);
    expect(headFor('/nada').jsonLd).toEqual([]);
    expect(headFor('/nada').meta).toEqual([]);
  });

  it('renders OG, preload and script-safe JSON-LD tags', () => {
    const head = headFor('/', undefined, { heroImage: 'https://blob.example.com/p.jpg' });
    head.jsonLd = [{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }];
    const html = renderHeadTags(head);
    expect(html).toContain('<meta property="og:title" content="Lodges y guías de pesca con mosca en Chile y la Patagonia | ONA Experiences" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('<link rel="preload" as="image" href="https://blob.example.com/p.jpg" fetchpriority="high" />');
    expect(html).toContain('<script type="application/ld+json">{"@type":"Thing","name":"\\u003c/script\\u003e');
    expect(html).not.toContain('</script><script>');
  });
});

describe('excerptFromHtml', () => {
  it('strips tags, decodes entities and collapses whitespace', () => {
    expect(excerptFromHtml('<h2>R&iacute;o&nbsp;Baker</h2><p>Truchas &amp; salmones&#33; &#x1F41F;</p>')).toBe(
      'Río Baker Truchas & salmones! 🐟'
    );
  });

  it('cuts at a word boundary', () => {
    const text = excerptFromHtml(`<p>${'palabra '.repeat(40)}</p>`, 50);
    expect(text.length).toBeLessThanOrEqual(50);
    expect(text).toMatch(/palabra…$/);
  });

  it('returns an empty string for empty input', () => {
    expect(excerptFromHtml('')).toBe('');
    expect(excerptFromHtml(null)).toBe('');
  });
});

describe('renderHeadTags', () => {
  it('renders escaped tags for a server render', () => {
    const html = renderHeadTags(headFor('/'));
    expect(html).toContain('<title>Lodges y guías de pesca con mosca en Chile y la Patagonia | ONA Experiences</title>');
    expect(html).toContain(`<link rel="canonical" href="${SITE}/" />`);
    expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE}/" />`);
    expect(renderHeadTags({ ...headFor('/'), title: 'A <b> & "c"' })).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
  });
});
