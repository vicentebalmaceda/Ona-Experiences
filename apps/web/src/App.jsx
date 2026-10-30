import { Routes, Route, useLocation } from 'react-router-dom';
import { HeadProvider } from './components/DocumentMeta.jsx';
import LocaleLayout from './components/LocaleLayout.jsx';
import TroutJump from './components/TroutJump.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { SiteAssetsProvider } from './site/SiteAssetsProvider.jsx';
import { ROUTES, SUPPORTED_LANGS } from './routes.js';

/** Element per public page id; paths come from ROUTES (src/routes.js). */
const PAGE_ELEMENTS = {
  home: <LandingPage />,
  about: <AboutPage />,
  lodge: <ProductDetailPage catalogType="lodges" />,
  guide: <ProductDetailPage catalogType="guides" />,
  review: <ReviewPage />,
  notFound: <NotFoundPage />
};

function App() {
  const { pathname } = useLocation();

  return (
    <SiteAssetsProvider>
      <HeadProvider>
        <Routes>
          {SUPPORTED_LANGS.map(lang => (
            <Route key={lang} element={<LocaleLayout lang={lang} />}>
              {Object.entries(PAGE_ELEMENTS)
                .filter(([pageId]) => ROUTES[pageId][lang])
                .map(([pageId, element]) => (
                  <Route key={pageId} path={ROUTES[pageId][lang]} element={element} />
                ))}
            </Route>
          ))}
          {/* Admin is Spanish-only and outside the locale layout (ROUTES.admin.es). */}
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
        {!pathname.startsWith('/admin') && <TroutJump />}
      </HeadProvider>
    </SiteAssetsProvider>
  );
}

export default App;
