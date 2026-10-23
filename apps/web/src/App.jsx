import { Routes, Route, useLocation } from 'react-router-dom';
import DocumentMeta from './components/DocumentMeta.jsx';
import TroutJump from './components/TroutJump.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { SiteAssetsProvider } from './site/SiteAssetsProvider.jsx';

function App() {
  const { pathname } = useLocation();

  return (
    <SiteAssetsProvider>
      <DocumentMeta />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lodges/:productId" element={<ProductDetailPage catalogType="lodges" />} />
        <Route path="/guides/:productId" element={<ProductDetailPage catalogType="guides" />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
      {!pathname.startsWith('/admin') && <TroutJump />}
    </SiteAssetsProvider>
  );
}

export default App;
