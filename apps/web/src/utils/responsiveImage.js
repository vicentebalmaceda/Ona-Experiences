/**
 * Responsive image helpers.
 *
 * Bundled photos under assets/{lodges,guides,about} have WebP variants built by
 * scripts/optimize-images.mjs at public/assets/_img/<dir>/<name>-<width>.webp.
 * Keep RESPONSIVE_WIDTHS and the naming in sync with that script.
 * Anything else (Vercel Blob, BSale CDN, other external URLs) is returned as is.
 */
export const RESPONSIVE_WIDTHS = [480, 960, 1600];

const LOCAL_IMAGE = /^\/assets\/(lodges|guides|about)\/([^/?#]+)\.(?:jpe?g|png|webp|avif)$/i;

/** Normalizes a catalog image path ("assets/x.jpg" or "/assets/x.jpg") to a root-relative URL. */
export function imageUrl(src) {
  if (!src || typeof src !== 'string') return '';
  if (/^(https?:|data:|blob:)/i.test(src) || src.startsWith('//')) return src;
  return `/${src.replace(/^\/+/, '')}`;
}

/**
 * Returns `{ src, srcSet, sizes }` for bundled photos (original file as `src`
 * fallback, WebP variants in `srcSet`), or just `{ src }` for other URLs.
 * Spread the result onto an <img>.
 *
 * @param {string} src catalog image path or URL
 * @param {string} [sizes] the `sizes` attribute, e.g. '(min-width: 1024px) 33vw, 100vw'
 */
export function responsiveImage(src, sizes = '100vw') {
  const url = imageUrl(src);
  const match = LOCAL_IMAGE.exec(url);
  if (!match) return { src: url };
  const [, dir, name] = match;
  const base = `/assets/_img/${dir}/${encodeURIComponent(decodeURIComponentSafe(name))}`;
  return {
    src: url,
    srcSet: RESPONSIVE_WIDTHS.map((width) => `${base}-${width}.webp ${width}w`).join(', '),
    sizes
  };
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
