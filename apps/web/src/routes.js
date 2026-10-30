/**
 * Route table: the single source of truth for public URLs and their language.
 *
 * The language comes ONLY from the URL: Spanish is the default (no prefix, and
 * the x-default), English lives under `/en`. `App.jsx` generates its <Route>s
 * from `ROUTES`, the head builder and the language switcher use the helpers
 * below, and a Phase 4 prerender can call `matchRoute` on the request path.
 *
 * Pure and dependency-free apart from `shared/` (no window/document), so it is
 * safe to import on the server and in build scripts.
 */
import { productSlug } from '../shared/productSlug.ts';

export const SUPPORTED_LANGS = ['es', 'en'];
export const DEFAULT_LANG = 'es';

/**
 * pageId → { [lang]: pattern }. A missing language means the page does not
 * exist in it. Patterns use `:name` for one segment and a trailing `*` for the rest.
 */
export const ROUTES = {
  home: { es: '/', en: '/en' },
  about: { es: '/quienes-somos', en: '/en/about' },
  lodge: { es: '/lodges/:slug', en: '/en/lodges/:slug' },
  guide: { es: '/guides/:slug', en: '/en/guides/:slug' },
  review: { es: '/review' },
  admin: { es: '/admin/*' },
  notFound: { es: '*', en: '/en/*' }
};

/** Match order: specific pages first, the English catch-all before the Spanish one. */
const MATCH_ORDER = [
  ...Object.keys(ROUTES)
    .filter(pageId => pageId !== 'notFound')
    .flatMap(pageId => SUPPORTED_LANGS.filter(lang => ROUTES[pageId][lang]).map(lang => [pageId, lang])),
  ['notFound', 'en'],
  ['notFound', 'es']
];

/** Normalizes any language tag ('en-US', 'EN', undefined) to a supported language. */
export function normalizeLang(lang) {
  const base = String(lang || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGS.includes(base) ? base : DEFAULT_LANG;
}

function splitPath(path) {
  return String(path || '/')
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean);
}

function matchPattern(pattern, segments) {
  const parts = splitPath(pattern);
  const params = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === '*') {
      params['*'] = segments.slice(i).join('/');
      return params;
    }
    const segment = segments[i];
    if (segment == null) return null;
    if (part.startsWith(':')) {
      try {
        params[part.slice(1)] = decodeURIComponent(segment);
      } catch {
        params[part.slice(1)] = segment;
      }
    } else if (part.toLowerCase() !== segment.toLowerCase()) {
      return null;
    }
  }
  return segments.length === parts.length ? params : null;
}

/**
 * The page a pathname shows: `{ pageId, lang, params }`. Every path matches
 * (unknown ones as `notFound`); `null` only for non-path input.
 */
export function matchRoute(pathname) {
  if (typeof pathname !== 'string') return null;
  const segments = splitPath(pathname);
  for (const [pageId, lang] of MATCH_ORDER) {
    const params = matchPattern(ROUTES[pageId][lang], segments);
    if (params) return { pageId, lang, params };
  }
  return null;
}

/** The URL language of a pathname ('/en…' → 'en', anything else → 'es'). */
export function langFromPath(pathname) {
  return matchRoute(pathname)?.lang ?? DEFAULT_LANG;
}

/**
 * The path of a page in a language, or `null` when the page does not exist in
 * that language. Throws when a `:param` is missing, which is a programming error.
 */
export function localizePath(pageId, lang, params = {}) {
  const pattern = ROUTES[pageId]?.[lang];
  if (!pattern) return null;
  const parts = splitPath(pattern).map(part => {
    if (part === '*') return params['*'] || '';
    if (part.startsWith(':')) {
      const value = params[part.slice(1)];
      if (value == null || value === '') {
        throw new Error(`localizePath(${pageId}, ${lang}): missing param "${part.slice(1)}"`);
      }
      return encodeURIComponent(String(value));
    }
    return part;
  });
  const path = `/${parts.filter(Boolean).join('/')}`;
  return path;
}

/**
 * The same page in each language where it exists: `{ es?: path, en?: path }`.
 * Unknown paths (notFound) have no alternates.
 */
export function alternatesFor(pathname) {
  const match = matchRoute(pathname);
  if (!match || match.pageId === 'notFound') return {};
  const alternates = {};
  for (const lang of SUPPORTED_LANGS) {
    const path = localizePath(match.pageId, lang, match.params);
    if (path) alternates[lang] = path;
  }
  return alternates;
}

/** Home path plus a section hash, e.g. ('en', 'contacto') → '/en#contacto'. */
export function homeSectionPath(lang, sectionId) {
  const home = localizePath('home', lang);
  return sectionId ? `${home}#${String(sectionId).replace(/^#/, '')}` : home;
}

/** Detail page path of a lodge or guide (`item.type` 'Lodge' → lodge), or `null` without productId. */
export function detailPathFor(item, lang) {
  const slug = productSlug(item);
  if (!slug) return null;
  return localizePath(item.type === 'Lodge' ? 'lodge' : 'guide', lang, { slug });
}
