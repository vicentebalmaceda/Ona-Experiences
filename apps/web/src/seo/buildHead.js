/**
 * Head metadata as data: a pure function of the page, its language and (for
 * detail pages) the loaded item. The browser applies the result with
 * `applyHead` (DocumentMeta.jsx); a Phase 4 prerender renders the same object
 * with `renderHeadTags`. No window/document access here.
 *
 * Extension point (Phase 4): add Open Graph / Twitter tags and JSON-LD as new
 * fields of the returned object (e.g. `meta: [{ property, content }]`,
 * `jsonLd: {...}`) and teach `renderHeadTags` and `applyHead` to write them.
 */
import { SITE_URL } from '../../shared/site.ts';
import { parseProductSlug, productSlug } from '../../shared/productSlug.ts';
import { DEFAULT_LANG, localizePath, normalizeLang, SUPPORTED_LANGS } from '../routes.js';
import { zoneLabel } from '../utils/zones.js';

export const ROBOTS_INDEX = 'index, follow, max-image-preview:large';
export const ROBOTS_NOINDEX_FOLLOW = 'noindex, follow';
export const ROBOTS_NOINDEX_NOFOLLOW = 'noindex, nofollow';

const DESCRIPTION_MAX = 155;
const DESCRIPTION_MIN = 60;

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿', ordm: 'º', ordf: 'ª', deg: '°', middot: '·',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•'
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      try {
        return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
      } catch {
        return entity;
      }
    }
    return NAMED_ENTITIES[code] ?? entity;
  });
}

/**
 * Plain-text excerpt of description HTML (BSale market_info): tags stripped,
 * entities decoded, whitespace collapsed, cut at a word boundary to at most
 * `max` characters (with '…'). Empty string when there is no text.
 */
export function excerptFromHtml(html, max = DESCRIPTION_MAX) {
  if (!html || typeof html !== 'string') return '';
  const text = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, ' ')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const boundary = cut.lastIndexOf(' ');
  const head = (boundary > max * 0.6 ? cut.slice(0, boundary) : cut).replace(/[\s,;:.\-–—]+$/, '');
  return `${head}…`;
}

function absolute(path) {
  return path ? `${SITE_URL}${path === '/' ? '/' : path}` : null;
}

function detailTexts(pageId, item, t) {
  const kind = pageId === 'lodge' ? 'lodge' : 'guide';
  if (!item) {
    return { title: t(`seo.${kind}.title_generic`), description: t('seo.home.description') };
  }
  const name = item.name || '';
  const zone = zoneLabel(item.zone, t) || t('seo.default_zone');
  const fromItem = excerptFromHtml(item.description);
  return {
    title: t(`seo.${kind}.title`, { name, zone }),
    description: fromItem.length >= DESCRIPTION_MIN ? fromItem : t(`seo.${kind}.description`, { name, zone })
  };
}

/**
 * @param {object} input
 * @param {string} input.pageId   a key of ROUTES (home, about, lodge, guide, review, admin, notFound)
 * @param {string} input.lang     the URL language
 * @param {object} [input.params] route params (`slug` for detail pages)
 * @param {object} [input.item]   the loaded lodge/guide, for detail pages
 * @param {Function} input.t      i18next `t` fixed to `lang`
 * @returns {{ title: string, description: string, canonical: string|null,
 *   alternates: {hreflang: string, href: string}[], robots: string, htmlLang: string }}
 */
export function buildHead({ pageId, lang, params = {}, item, t }) {
  const language = normalizeLang(lang);
  const head = {
    title: t('seo.home.title'),
    description: t('seo.home.description'),
    canonical: null,
    alternates: [],
    robots: ROBOTS_INDEX,
    htmlLang: language
  };

  switch (pageId) {
    case 'home':
    case 'about': {
      head.title = t(`seo.${pageId}.title`);
      head.description = t(`seo.${pageId}.description`);
      head.canonical = absolute(localizePath(pageId, language));
      head.alternates = [
        ...SUPPORTED_LANGS.map(alt => ({ hreflang: alt, href: absolute(localizePath(pageId, alt)) })),
        { hreflang: 'x-default', href: absolute(localizePath(pageId, DEFAULT_LANG)) }
      ];
      break;
    }
    case 'lodge':
    case 'guide': {
      Object.assign(head, detailTexts(pageId, item, t));
      const productId = parseProductSlug(params.slug) ?? item?.productId;
      const slug = (item && productSlug({ name: item.name, productId })) || params.slug;
      if (language !== DEFAULT_LANG) {
        // BSale descriptions are Spanish-only: English detail pages stay out of
        // the index and are not paired with the Spanish ones.
        head.robots = ROBOTS_NOINDEX_FOLLOW;
      } else if (slug) {
        const esUrl = absolute(localizePath(pageId, DEFAULT_LANG, { slug }));
        head.canonical = esUrl;
        head.alternates = [
          { hreflang: DEFAULT_LANG, href: esUrl },
          { hreflang: 'x-default', href: esUrl }
        ];
      }
      break;
    }
    case 'review':
      head.title = t('seo.review.title');
      head.description = t('seo.review.description');
      head.robots = ROBOTS_NOINDEX_NOFOLLOW;
      break;
    case 'admin':
      head.title = t('seo.admin.title');
      head.robots = ROBOTS_NOINDEX_NOFOLLOW;
      break;
    default:
      head.title = t('seo.not_found.title');
      head.description = t('seo.not_found.description');
      head.robots = ROBOTS_NOINDEX_FOLLOW;
  }

  return head;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The head object as HTML tags for a server render (Phase 4). `htmlLang`
 * belongs on the <html> element and is not included.
 */
export function renderHeadTags(head) {
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<meta name="robots" content="${escapeHtml(head.robots)}" />`
  ];
  if (head.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(head.canonical)}" />`);
  for (const alt of head.alternates) {
    tags.push(`<link rel="alternate" hreflang="${escapeHtml(alt.hreflang)}" href="${escapeHtml(alt.href)}" />`);
  }
  return tags.join('\n');
}
