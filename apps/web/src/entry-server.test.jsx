import { describe, expect, it } from 'vitest';
import { render } from './entry-server.jsx';
import { renderHeadTags } from './seo/buildHead.js';
import { DESCRIPTION_TEXT, homeData, lodgeData } from './test/fixtures.js';

const SITE = 'https://www.onaexperiences.com';
const LODGE_PATH = '/lodges/bio-bio-lodge-65561';

describe('render (server entry)', () => {
  it('es home: hero heading, lodges from the embedded catalog, 200', () => {
    const { html, head, status } = render('/', homeData('/'));
    expect(status).toBe(200);
    expect(html).toMatch(/<h1[^>]*>[^<]*pesca con mosca/i);
    expect(html).toContain('Bio Bio Lodge');
    expect(html).toContain('href="/lodges/bio-bio-lodge-65561"');
    expect(html).toContain('src="https://blob.example.com/poster.jpg"');
    // The prerendered hero still is visible without JavaScript (LCP doesn't wait for hydration).
    const poster = html.match(/<img[^>]*src="https:\/\/blob\.example\.com\/poster\.jpg"[^>]*>/)[0];
    expect(poster).toContain('opacity-100');
    expect(poster).not.toContain('opacity-0');
    expect(poster).toContain('fetchpriority="high"');
    // The video mounts only after the still has loaded (perf phase), never in the HTML.
    expect(html).not.toContain('<video');
    expect(head.htmlLang).toBe('es');
    expect(head.canonical).toBe(`${SITE}/`);
    expect(head.preloads).toEqual([{ href: 'https://blob.example.com/poster.jpg', as: 'image', fetchpriority: 'high' }]);
    expect(head.jsonLd.map(block => block['@type'])).toEqual(['Organization', 'WebSite', 'ItemList']);
  });

  it('en home: English texts and English links', () => {
    const { html, head, status } = render('/en', homeData('/en', 'en'));
    expect(status).toBe(200);
    expect(html).toMatch(/<h1[^>]*>[^<]*fly fishing/i);
    expect(html).toContain('href="/en/lodges/bio-bio-lodge-65561"');
    expect(head.htmlLang).toBe('en');
    expect(head.canonical).toBe(`${SITE}/en`);
  });

  it('es lodge: name in the h1, sanitized description in the HTML, JSON-LD', () => {
    const { html, head, status } = render(LODGE_PATH, lodgeData(LODGE_PATH));
    expect(status).toBe(200);
    expect(html).toMatch(/<h1[^>]*>Bio Bio Lodge<\/h1>/);
    expect(html).toContain(DESCRIPTION_TEXT);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('aria-busy');
    expect(html).toContain('Ana P.');
    expect(head.canonical).toBe(`${SITE}${LODGE_PATH}`);
    expect(head.title).toContain('Bio Bio Lodge');
    const tags = renderHeadTags(head);
    expect(tags).toContain('"@type":"LodgingBusiness"');
    expect(tags).toContain(`<meta property="og:image" content="${SITE}/assets/lodges/bio-bio-lodge-1.jpg" />`);
  });

  it('en lodge: rendered in English, noindex, no JSON-LD', () => {
    const path = '/en/lodges/bio-bio-lodge-65561';
    const { html, head, status } = render(path, lodgeData(path, 'en'));
    expect(status).toBe(200);
    expect(html).toMatch(/<h1[^>]*>Bio Bio Lodge<\/h1>/);
    expect(head.robots).toBe('noindex, follow');
    expect(head.jsonLd).toEqual([]);
  });

  it('unknown paths and products without data are 404 not-found pages', () => {
    const unknown = render('/no-existe', { v: 1, path: '/no-existe', pageId: 'notFound', lang: 'es' });
    expect(unknown.status).toBe(404);
    expect(unknown.html).toContain('404');
    expect(unknown.head.robots).toBe('noindex, follow');
    expect(unknown.html).toContain('href="/en"');

    const enUnknown = render('/en/no-existe');
    expect(enUnknown.status).toBe(404);
    expect(enUnknown.head.htmlLang).toBe('en');

    const missing = render('/lodges/otro-lodge-99999', lodgeData('/lodges/otro-lodge-99999'));
    expect(missing.status).toBe(404);
    expect(missing.html).not.toContain('Bio Bio Lodge</h1>');
    expect(missing.head.robots).toBe('noindex, follow');
  });

  it('renders without embedded data (no throw)', () => {
    expect(() => render('/')).not.toThrow();
    expect(() => render('/quienes-somos')).not.toThrow();
    expect(render('/en/about').status).toBe(200);
  });
});
