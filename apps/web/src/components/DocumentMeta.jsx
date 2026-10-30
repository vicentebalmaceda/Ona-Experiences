import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteAsset } from '../site/SiteAssetsProvider.jsx';
import { matchRoute } from '../routes.js';
import { buildHead } from '../seo/buildHead.js';
import { applyHead } from '../seo/applyHead.js';

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

/** Reports page-level head data: `{ item }` or `{ notFound: true }` (pass null to clear). */
export function useHeadOverride(data) {
  const setOverride = useContext(HeadOverrideContext);
  const { pathname } = useLocation();
  const item = data?.item ?? null;
  const notFound = Boolean(data?.notFound);
  useEffect(() => {
    setOverride(item || notFound ? { pathname, item, notFound } : null);
    return () => setOverride(null);
  }, [setOverride, pathname, item, notFound]);
}

/** Client head applier: favicon sync plus the tags from buildHead for the current URL. */
function DocumentMeta({ override }) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const logo = useSiteAsset('logo');

  useEffect(() => {
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && icon.getAttribute('href') !== logo.url) {
      icon.setAttribute('href', logo.url);
    }
  }, [logo.url]);

  const head = useMemo(() => {
    const match = matchRoute(pathname) ?? { pageId: 'notFound', lang: 'es', params: {} };
    const active = override && override.pathname === pathname ? override : null;
    return buildHead({
      pageId: active?.notFound ? 'notFound' : match.pageId,
      lang: match.lang,
      params: match.params,
      item: active?.item ?? undefined,
      t: i18n.getFixedT(match.lang)
    });
  }, [pathname, override, i18n]);

  useEffect(() => {
    applyHead(head);
  }, [head]);

  return null;
}

export default DocumentMeta;
