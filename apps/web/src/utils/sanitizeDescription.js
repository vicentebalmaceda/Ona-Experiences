/**
 * Sanitizer settings for BSale market_info HTML (lodge/guide descriptions).
 * Shared by the detail page (DOMPurify in the browser) and the prerender
 * (DOMPurify over jsdom at build time), so both produce the same markup.
 */
export const DESCRIPTION_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'br', 'a',
  'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
];
export const DESCRIPTION_ALLOWED_ATTR = ['href', 'target', 'rel'];

/** Sanitize BSale market_info HTML so tags and Spanish entities render safely. */
export function sanitizeMarketDescription(DOMPurify, html) {
  if (!DOMPurify || !html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DESCRIPTION_ALLOWED_TAGS,
    ALLOWED_ATTR: DESCRIPTION_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim();
}
