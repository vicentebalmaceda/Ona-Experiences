import { describe, expect, it } from 'vitest';
import {
  alternatesFor,
  detailPathFor,
  homeSectionPath,
  langFromPath,
  localizePath,
  matchRoute,
  normalizeLang,
  ROUTES,
  SUPPORTED_LANGS
} from './routes.js';

describe('localizePath', () => {
  it('builds each page in each language', () => {
    expect(localizePath('home', 'es')).toBe('/');
    expect(localizePath('home', 'en')).toBe('/en');
    expect(localizePath('about', 'es')).toBe('/quienes-somos');
    expect(localizePath('about', 'en')).toBe('/en/about');
    expect(localizePath('lodge', 'es', { slug: 'bio-bio-2007' })).toBe('/lodges/bio-bio-2007');
    expect(localizePath('guide', 'en', { slug: 'juan-perez-12' })).toBe('/en/guides/juan-perez-12');
    expect(localizePath('review', 'es')).toBe('/review');
  });

  it('returns null where the page does not exist', () => {
    expect(localizePath('review', 'en')).toBeNull();
    expect(localizePath('admin', 'en')).toBeNull();
    expect(localizePath('nope', 'es')).toBeNull();
  });

  it('fills splats and throws on missing params', () => {
    expect(localizePath('notFound', 'en', { '*': 'foo/bar' })).toBe('/en/foo/bar');
    expect(localizePath('notFound', 'en')).toBe('/en');
    expect(() => localizePath('lodge', 'es')).toThrow(/slug/);
  });

  it('round-trips through matchRoute for every page and language', () => {
    for (const [pageId, patterns] of Object.entries(ROUTES)) {
      for (const lang of SUPPORTED_LANGS) {
        if (!patterns[lang] || pageId === 'notFound') continue;
        const params = patterns[lang].includes(':slug') ? { slug: 'x-1' } : {};
        const path = localizePath(pageId, lang, params);
        expect(matchRoute(path)).toMatchObject({ pageId, lang });
      }
    }
  });
});

describe('matchRoute', () => {
  it('matches the home pages', () => {
    expect(matchRoute('/')).toEqual({ pageId: 'home', lang: 'es', params: {} });
    expect(matchRoute('/en')).toEqual({ pageId: 'home', lang: 'en', params: {} });
    expect(matchRoute('/en/')).toEqual({ pageId: 'home', lang: 'en', params: {} });
  });

  it('matches detail pages and decodes the slug', () => {
    expect(matchRoute('/lodges/bio-bio-2007')).toEqual({ pageId: 'lodge', lang: 'es', params: { slug: 'bio-bio-2007' } });
    expect(matchRoute('/en/guides/2007')).toEqual({ pageId: 'guide', lang: 'en', params: { slug: '2007' } });
    expect(matchRoute('/lodges/caf%C3%A9-1').params.slug).toBe('café-1');
  });

  it('ignores trailing slashes, query and hash', () => {
    expect(matchRoute('/quienes-somos/')).toMatchObject({ pageId: 'about', lang: 'es' });
    expect(matchRoute('/en/about?x=1#top')).toMatchObject({ pageId: 'about', lang: 'en' });
  });

  it('matches review and admin in Spanish only', () => {
    expect(matchRoute('/review')).toMatchObject({ pageId: 'review', lang: 'es' });
    expect(matchRoute('/admin')).toMatchObject({ pageId: 'admin', lang: 'es' });
    expect(matchRoute('/admin/site-assets')).toMatchObject({ pageId: 'admin', params: { '*': 'site-assets' } });
    expect(matchRoute('/en/review')).toMatchObject({ pageId: 'notFound', lang: 'en' });
  });

  it('falls back to notFound in the URL language', () => {
    expect(matchRoute('/nada-aqui')).toEqual({ pageId: 'notFound', lang: 'es', params: { '*': 'nada-aqui' } });
    expect(matchRoute('/en/nothing/here')).toEqual({ pageId: 'notFound', lang: 'en', params: { '*': 'nothing/here' } });
    expect(matchRoute('/lodges')).toMatchObject({ pageId: 'notFound', lang: 'es' });
    expect(matchRoute('/lodges/a/b')).toMatchObject({ pageId: 'notFound', lang: 'es' });
    expect(matchRoute('/english')).toMatchObject({ pageId: 'notFound', lang: 'es' });
  });

  it('returns null for non-strings', () => {
    expect(matchRoute(undefined)).toBeNull();
  });
});

describe('langFromPath / normalizeLang', () => {
  it('derives the language from the URL only', () => {
    expect(langFromPath('/')).toBe('es');
    expect(langFromPath('/en')).toBe('en');
    expect(langFromPath('/en/lodges/x-1')).toBe('en');
    expect(langFromPath('/enlace')).toBe('es');
  });

  it('normalizes language tags', () => {
    expect(normalizeLang('en-US')).toBe('en');
    expect(normalizeLang('ES')).toBe('es');
    expect(normalizeLang('fr')).toBe('es');
    expect(normalizeLang(undefined)).toBe('es');
  });
});

describe('alternatesFor', () => {
  it('pairs pages that exist in both languages', () => {
    expect(alternatesFor('/')).toEqual({ es: '/', en: '/en' });
    expect(alternatesFor('/en/about')).toEqual({ es: '/quienes-somos', en: '/en/about' });
    expect(alternatesFor('/lodges/bio-bio-2007')).toEqual({
      es: '/lodges/bio-bio-2007',
      en: '/en/lodges/bio-bio-2007'
    });
  });

  it('lists only the languages where the page exists', () => {
    expect(alternatesFor('/review')).toEqual({ es: '/review' });
    expect(alternatesFor('/admin/x')).toEqual({ es: '/admin/x' });
  });

  it('has no alternates for unknown pages', () => {
    expect(alternatesFor('/nada')).toEqual({});
    expect(alternatesFor('/en/nothing')).toEqual({});
  });
});

describe('link helpers', () => {
  it('builds home section links', () => {
    expect(homeSectionPath('es', 'contacto')).toBe('/#contacto');
    expect(homeSectionPath('en', '#lodges-section')).toBe('/en#lodges-section');
    expect(homeSectionPath('en')).toBe('/en');
  });

  it('builds detail links from items', () => {
    expect(detailPathFor({ type: 'Lodge', name: 'Bio Bio River Lodge', productId: 2007 }, 'es')).toBe(
      '/lodges/bio-bio-river-lodge-2007'
    );
    expect(detailPathFor({ type: 'Guía', name: 'Juan Pérez', productId: 12 }, 'en')).toBe('/en/guides/juan-perez-12');
    expect(detailPathFor({ type: 'Lodge', name: 'Seed only' }, 'es')).toBeNull();
  });
});
