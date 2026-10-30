/**
 * Head metadata as data: a pure function of the page, its language and what
 * the page shows (the loaded lodge/guide and its reviews, the landing's lodge
 * list, the published hero image). The prerender renders the result with
 * `renderHeadTags`; the browser applies the same object with `applyHead`
 * (DocumentMeta.jsx), so both produce the same head. No window/document here.
 */
import {
  DEFAULT_SHARE_IMAGE,
  SITE_ALTERNATE_NAME,
  SITE_NAME,
  SITE_SAME_AS,
  SITE_URL
} from '../../shared/site.ts';
import { parseProductSlug, productSlug } from '../../shared/productSlug.ts';
import { DEFAULT_LANG, localizePath, normalizeLang, SUPPORTED_LANGS } from '../routes.js';
import { zoneLabel } from '../utils/zones.js';
import { imageUrl } from '../utils/responsiveImage.js';
import { serializeJsonForScript } from './serializeJson.js';

export const ROBOTS_INDEX = 'index, follow, max-image-preview:large';
export const ROBOTS_NOINDEX_FOLLOW = 'noindex, follow';
export const ROBOTS_NOINDEX_NOFOLLOW = 'noindex, nofollow';

const DESCRIPTION_MAX = 155;
const DESCRIPTION_MIN = 60;
const JSON_LD_DESCRIPTION_MAX = 300;
const DEFAULT_LOGO = '/assets/logo-ona.png';

/** Open Graph locale per URL language. */
const OG_LOCALES = { es: 'es_CL', en: 'en_US' };

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

/** Absolute URL of an image: external URLs as they are, bundled paths on SITE_URL. */
export function absoluteImageUrl(src) {
  const url = imageUrl(src);
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return url.startsWith('/') ? `${SITE_URL}${url}` : null;
}

/** The item's photos, deduplicated, gallery first (the order of the detail page). */
function itemImages(item) {
  const sources = [...(Array.isArray(item?.gallery) ? item.gallery : []), item?.image];
  const seen = new Set();
  const urls = [];
  for (const src of sources) {
    const url = absoluteImageUrl(src);
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/**
 * The rating the detail page shows: the visible-review aggregate from the
 * reviews endpoint, else the item's own (also visible-only, see
 * applyVisibleReviewAggregate in the API). `null` without at least one review.
 */
export function visibleRating(item, reviews) {
  const average = reviews?.average ?? item?.rating ?? null;
  const count = Number(reviews?.count ?? item?.reviews ?? 0);
  if (!(count >= 1) || typeof average !== 'number' || !Number.isFinite(average)) return null;
  return { average, count };
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

function socialMeta({ title, description, url, image, lang }) {
  const meta = [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description }
  ];
  if (url) meta.push({ property: 'og:url', content: url });
  if (image) meta.push({ property: 'og:image', content: image });
  meta.push({ property: 'og:locale', content: OG_LOCALES[lang] });
  for (const other of SUPPORTED_LANGS) {
    if (other !== lang) meta.push({ property: 'og:locale:alternate', content: OG_LOCALES[other] });
  }
  meta.push(
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description }
  );
  if (image) meta.push({ name: 'twitter:image', content: image });
  return meta;
}

function homeJsonLd({ lang, logoUrl, lodges, t }) {
  const home = absolute('/');
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${home}#organization`,
    name: SITE_NAME,
    url: home,
    logo: absoluteImageUrl(logoUrl || DEFAULT_LOGO),
    sameAs: [...SITE_SAME_AS]
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${home}#website`,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: home,
    inLanguage: lang,
    publisher: { '@id': `${home}#organization` }
  };
  const blocks = [organization, website];
  // Lodge pages are indexed in Spanish only, so the list points at those URLs.
  const elements = (lodges || [])
    .map(item => ({ item, slug: productSlug(item) }))
    .filter(({ slug }) => slug)
    .map(({ item, slug }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absolute(localizePath('lodge', DEFAULT_LANG, { slug })),
      name: item.name
    }));
  if (elements.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: t('lodges.title'),
      itemListElement: elements
    });
  }
  return blocks;
}

function detailJsonLd({ pageId, item, reviews, url, description, t }) {
  const business = {
    '@context': 'https://schema.org',
    '@type': pageId === 'lodge' ? 'LodgingBusiness' : 'LocalBusiness',
    '@id': `${url}#business`,
    name: item.name,
    description: excerptFromHtml(item.description, JSON_LD_DESCRIPTION_MAX) || description,
    url
  };
  const images = itemImages(item);
  if (images.length) business.image = images;
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    business.geo = { '@type': 'GeoCoordinates', latitude: item.lat, longitude: item.lng };
  }
  const region = zoneLabel(item.zone, t);
  business.address = {
    '@type': 'PostalAddress',
    ...(region ? { addressRegion: region } : {}),
    addressCountry: 'CL'
  };
  const rating = visibleRating(item, reviews);
  if (rating) {
    business.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(rating.average * 10) / 10,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1
    };
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absolute('/') },
      { '@type': 'ListItem', position: 2, name: item.name, item: url }
    ]
  };
  return [business, breadcrumbs];
}

/**
 * @param {object} input
 * @param {string} input.pageId     a key of ROUTES (home, about, lodge, guide, review, admin, notFound)
 * @param {string} input.lang       the URL language
 * @param {object} [input.params]   route params (`slug` for detail pages)
 * @param {object} [input.item]     the loaded lodge/guide, for detail pages
 * @param {object} [input.reviews]  the item's visible-review view `{ average, count }`
 * @param {object[]} [input.lodges] the landing's lodges (home ItemList)
 * @param {string} [input.heroImage] the hero's still image URL (home preload, og:image of home/about)
 * @param {string} [input.logoUrl]  the published logo (Organization logo)
 * @param {Function} input.t        i18next `t` fixed to `lang`
 * @returns {{ title: string, description: string, canonical: string|null,
 *   alternates: {hreflang: string, href: string}[], robots: string, htmlLang: string,
 *   meta: {property?: string, name?: string, content: string}[], jsonLd: object[],
 *   preloads: {href: string, as: string, fetchpriority?: string}[] }}
 */
export function buildHead({ pageId, lang, params = {}, item, reviews, lodges, heroImage, logoUrl, t }) {
  const language = normalizeLang(lang);
  const head = {
    title: t('seo.home.title'),
    description: t('seo.home.description'),
    canonical: null,
    alternates: [],
    robots: ROBOTS_INDEX,
    htmlLang: language,
    meta: [],
    jsonLd: [],
    preloads: []
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
      head.meta = socialMeta({
        title: head.title,
        description: head.description,
        url: head.canonical,
        image: absoluteImageUrl(heroImage || DEFAULT_SHARE_IMAGE),
        lang: language
      });
      if (pageId === 'home') {
        head.jsonLd = homeJsonLd({ lang: language, logoUrl, lodges, t });
        // The hero still is the LCP image: fetch it with the HTML instead of
        // after the site-assets request and the JS bundle.
        if (heroImage) head.preloads = [{ href: heroImage, as: 'image', fetchpriority: 'high' }];
      }
      break;
    }
    case 'lodge':
    case 'guide': {
      Object.assign(head, detailTexts(pageId, item, t));
      const productId = parseProductSlug(params.slug) ?? item?.productId;
      const slug = (item && productSlug({ name: item.name, productId })) || params.slug;
      const pageUrl = slug ? absolute(localizePath(pageId, language, { slug })) : null;
      if (language !== DEFAULT_LANG) {
        // BSale descriptions are Spanish-only: English detail pages stay out of
        // the index and are not paired with the Spanish ones.
        head.robots = ROBOTS_NOINDEX_FOLLOW;
      } else if (slug) {
        head.canonical = pageUrl;
        head.alternates = [
          { hreflang: DEFAULT_LANG, href: pageUrl },
          { hreflang: 'x-default', href: pageUrl }
        ];
      }
      if (item) {
        head.meta = socialMeta({
          title: head.title,
          description: head.description,
          url: head.canonical ?? pageUrl,
          image: itemImages(item)[0] ?? absoluteImageUrl(DEFAULT_SHARE_IMAGE),
          lang: language
        });
        // Structured data only where the page is indexed.
        if (head.robots === ROBOTS_INDEX && head.canonical) {
          head.jsonLd = detailJsonLd({ pageId, item, reviews, url: head.canonical, description: head.description, t });
        }
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

/** Attribute key of a head meta entry: `property` (Open Graph) or `name` (everything else). */
export function metaKey(entry) {
  return entry.property ? ['property', entry.property] : ['name', entry.name];
}

/**
 * The head object as HTML tags for a server render. `htmlLang` belongs on the
 * <html> element and is not included.
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
  for (const preload of head.preloads ?? []) {
    const priority = preload.fetchpriority ? ` fetchpriority="${escapeHtml(preload.fetchpriority)}"` : '';
    tags.push(`<link rel="preload" as="${escapeHtml(preload.as)}" href="${escapeHtml(preload.href)}"${priority} />`);
  }
  for (const entry of head.meta ?? []) {
    const [attr, key] = metaKey(entry);
    tags.push(`<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(entry.content)}" />`);
  }
  for (const block of head.jsonLd ?? []) {
    tags.push(`<script type="application/ld+json">${serializeJsonForScript(block)}</script>`);
  }
  return tags.join('\n');
}
