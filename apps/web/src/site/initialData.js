import { createContext, useContext } from 'react';

/**
 * Data the prerender embedded for the first render (window.__ONA_DATA__):
 *
 *   { v, path, pageId, lang,
 *     siteAssets: { items },                       // GET /api/v1/site/assets
 *     catalog?: { lodges: [...], guides: [...] },  // GET /api/v1/{lodges,guides} (home)
 *     detail?: { catalogType, item, reviews, descriptionHtml } }  // detail pages
 *
 * Pages initialize their state from it when it matches what they show, so the
 * first client render equals the server render (hydration), then revalidate
 * from /api/v1 after mount.
 *
 * `ssr` is true while rendering on the server: pages then render their final
 * state (e.g. not found) instead of a loading placeholder that no effect will
 * ever resolve.
 */
export const InitialDataContext = createContext({ data: null, ssr: false });

export function useInitialData() {
  return useContext(InitialDataContext);
}

/** Reads and validates window.__ONA_DATA__ (browser only). */
export function readInitialData(win = typeof window === 'undefined' ? undefined : window) {
  const data = win?.__ONA_DATA__;
  return data && typeof data === 'object' && data.v === 1 ? data : null;
}
