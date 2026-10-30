/**
 * Public site constants shared by the SPA, the head builder and (later) the
 * prerender and sitemap build scripts. Dependency-free on purpose.
 */

/** Canonical origin of the public site: absolute canonical and hreflang URLs start here. */
export const SITE_URL = 'https://www.onaexperiences.com';

export const SITE_NAME = 'ONA Experiences';

/** Short brand name (schema.org WebSite `alternateName`). */
export const SITE_ALTERNATE_NAME = 'ONA';

/** Profiles of the same organization elsewhere (schema.org Organization `sameAs`). */
export const SITE_SAME_AS: readonly string[] = ['https://www.onaflyfishing.cl'];

/**
 * Bundled landscape photo used as og:image for pages without their own photo
 * (home and about) when no hero poster/image is published.
 */
export const DEFAULT_SHARE_IMAGE = '/assets/lodges/manihuales-eco-lodge-5.jpg';
