import { createRoot, hydrateRoot } from 'react-dom/client';
import './fonts.css';
import './styles.css';
import { createI18n } from './i18n';
import { matchRoute } from './routes.js';
import { readInitialData } from './site/initialData.js';
import ClientApp from './ClientApp.jsx';

const container = document.getElementById('root');
const data = readInitialData();
// The content language comes only from the URL ('/en…' → en, else es).
const route = matchRoute(window.location.pathname) ?? { pageId: 'notFound', lang: 'es' };
const i18n = createI18n(route.lang);

function samePath(a, b) {
  const normalize = (path) => {
    let value = String(path || '/');
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep it encoded.
    }
    return value.length > 1 ? value.replace(/\/+$/, '') : value;
  };
  return normalize(a) === normalize(b);
}

/**
 * Hydrate only HTML prerendered for this very page. The same static file can
 * be served for other URLs: 404.html (the Spanish not-found page) answers every
 * unknown path, e.g. /en/x, which renders in English. Those, and the empty
 * spa.html shell, are rendered from scratch instead.
 */
const prerenderedHere =
  container.hasChildNodes() &&
  data != null &&
  data.pageId === route.pageId &&
  data.lang === route.lang &&
  (route.pageId === 'notFound' || samePath(data.path, window.location.pathname));

const app = <ClientApp data={data} i18n={i18n} />;

if (prerenderedHere) {
  hydrateRoot(container, app);
} else {
  if (container.hasChildNodes()) container.replaceChildren();
  createRoot(container).render(app);
}
