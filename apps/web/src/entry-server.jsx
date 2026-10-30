/**
 * Server entry for the build-time prerender (scripts/prerender.ts).
 *
 *   matchRoute(url) → createI18n(lang) → renderToString(<App/> in a StaticRouter)
 *   → buildHead(...) with the same inputs the browser derives from
 *     window.__ONA_DATA__ (src/site/pageData.js)
 *
 * The element tree mirrors main.jsx (StrictMode → InitialDataContext →
 * I18nextProvider → router → App) so the browser can hydrate the output.
 * Built with `vite build --ssr`; never shipped to the browser.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18n } from './i18n/index.js';
import { matchRoute } from './routes.js';
import { InitialDataContext } from './site/initialData.js';
import { headInputFromInitialData, initialDetailFor } from './site/pageData.js';
import { buildHead, renderHeadTags } from './seo/buildHead.js';
import { serializeJsonForScript } from './seo/serializeJson.js';
import { parseProductSlug } from '../shared/productSlug.ts';
import App from './App.jsx';

// Pure helpers the prerender script uses, taken from this bundle so the build
// runs exactly the code the site ships.
export { buildSitemap } from './seo/sitemap.js';
export { ROBOTS_INDEX } from './seo/buildHead.js';
export { localizePath, SUPPORTED_LANGS } from './routes.js';
export { productSlug } from '../shared/productSlug.ts';
export { sanitizeMarketDescription } from './utils/sanitizeDescription.js';
export { landingList } from './site/pageData.js';
export { SITE_URL } from '../shared/site.ts';
export { renderHeadTags, serializeJsonForScript };

const DETAIL_CATALOG = { lodge: 'lodges', guide: 'guides' };

/**
 * Renders one URL.
 *
 * @param {string} url  path (and optional query) of the page, e.g. '/en/lodges/x-12'
 * @param {object} [initialData]  what window.__ONA_DATA__ will hold for this page
 * @returns {{ html: string, head: object, status: number }}
 *   `html` is the markup for #root; `head` is the buildHead result; `status`
 *   is 404 for unknown paths and for detail pages without embedded product data.
 */
export function render(url, initialData = null) {
  const pathname = String(url || '/').split(/[?#]/)[0] || '/';
  const match = matchRoute(pathname) ?? { pageId: 'notFound', lang: 'es', params: {} };
  const i18n = createI18n(match.lang);
  const data = initialData ?? null;

  let pageId = match.pageId;
  if (DETAIL_CATALOG[pageId]) {
    const productId = parseProductSlug(match.params.slug);
    if (!initialDetailFor(data, DETAIL_CATALOG[pageId], productId)) pageId = 'notFound';
  }

  const html = renderToString(
    <React.StrictMode>
      <InitialDataContext.Provider value={{ data, ssr: true }}>
        <I18nextProvider i18n={i18n}>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </I18nextProvider>
      </InitialDataContext.Provider>
    </React.StrictMode>
  );

  const input = headInputFromInitialData(data);
  const head = buildHead({
    pageId,
    lang: match.lang,
    params: match.params,
    item: pageId === match.pageId ? input.item : undefined,
    reviews: input.reviews,
    lodges: input.lodges,
    heroImage: input.heroImage,
    logoUrl: input.logoUrl,
    t: i18n.getFixedT(match.lang)
  });

  return { html, head, status: pageId === 'notFound' ? 404 : 200 };
}
