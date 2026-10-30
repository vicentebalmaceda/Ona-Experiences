import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DocumentMeta from './components/DocumentMeta.jsx';
import TroutJump from './components/TroutJump.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import { SiteAssetsProvider } from './site/SiteAssetsProvider.jsx';

// Admin console is code-split so the public bundle doesn't ship it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function App() {
  const { pathname } = useLocation();

  return (
    <SiteAssetsProvider>
      <DocumentMeta />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lodges/:productId" element={<ProductDetailPage catalogType="lodges" />} />
        <Route path="/guides/:productId" element={<ProductDetailPage catalogType="guides" />} />
        <Route path="/quienes-somos" element={<AboutPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/admin/*" element={<Suspense fallback={<div className="min-h-screen bg-slate-50" />}><AdminApp /></Suspense>} />
      </Routes>
      {!pathname.startsWith('/admin') && <TroutJump />}
    </SiteAssetsProvider>
  );
}

export default App;
