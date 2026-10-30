import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteAsset } from '../site/SiteAssetsProvider.jsx';
import { matchRoute } from '../routes.js';
import { buildHead, ROBOTS_INDEX, ROBOTS_NOINDEX_FOLLOW } from '../seo/buildHead.js';
import { applyHead } from '../seo/applyHead.js';
import { useInitialData } from '../site/initialData.js';
import { headInputFromInitialData, heroStillUrl } from '../site/pageData.js';

/**
 * Pages that know more than the URL (the loaded lodge/guide, or that the
 * product doesn't exist) report it here; DocumentMeta folds it into buildHead.
 * An override is tied to the pathname it was set for and ignored elsewhere.
 */
const HeadOverrideContext = createContext(() => {});

export function HeadProvider({ children }) {
  const [override, setOverride] = useState(null);
  return (
    <HeadOverrideContext.Provider value={setOverride}>
      {children}
      <DocumentMeta override={override} />
    </HeadOverrideContext.Provider>
  );
}

/** Reports page-level head data: `{ item, reviews }` or `{ notFound: true }` (pass null to clear). */
export function useHeadOverride(data) {
  const setOverride = useContext(HeadOverrideContext);
  const { pathname } = useLocation();
  const item = data?.item ?? null;
  const reviews = data?.reviews ?? null;
  const notFound = Boolean(data?.notFound);
  useEffect(() => {
    setOverride(item || notFound ? { pathname, item, reviews, notFound } : null);
    return () => setOverride(null);
  }, [setOverride, pathname, item, reviews, notFound]);
}

/**
 * Client head applier: favicon sync plus the tags from buildHead for the
 * current URL. On the prerendered URL it starts from the same inputs as the
 * server (the embedded data), so the first apply leaves the HTML head as is.
 */
function DocumentMeta({ override }) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const { data } = useInitialData();
  const logo = useSiteAsset('logo');
  const hero = useSiteAsset('hero');
  const poster = useSiteAsset('hero_poster');
  const heroImage = heroStillUrl(hero, poster);
  const embedded = useMemo(() => headInputFromInitialData(data), [data]);

  useEffect(() => {
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && icon.getAttribute('href') !== logo.url) {
      icon.setAttribute('href', logo.url);
    }
  }, [logo.url]);

  const head = useMemo(() => {
    const match = matchRoute(pathname) ?? { pageId: 'notFound', lang: 'es', params: {} };
    const active = override && override.pathname === pathname ? override : null;
    const fromData = data?.path === pathname ? embedded : {};
    const head = buildHead({
      pageId: active?.notFound ? 'notFound' : match.pageId,
      lang: match.lang,
      params: match.params,
      item: active?.item ?? fromData.item,
      reviews: active?.reviews ?? fromData.reviews,
      lodges: fromData.lodges,
      heroImage,
      logoUrl: logo.url,
      t: i18n.getFixedT(match.lang)
    });
    // No embedded data: this is spa.html, the client-only shell Vercel serves
    // for products added since the last build. It stays noindex (as its HTML
    // says) until the next build prerenders the page.
    if (!data && head.robots === ROBOTS_INDEX) head.robots = ROBOTS_NOINDEX_FOLLOW;
    return head;
  }, [pathname, override, i18n, data, embedded, heroImage, logo.url]);

  useEffect(() => {
    applyHead(head);
  }, [head]);

  return null;
}

export default DocumentMeta;
