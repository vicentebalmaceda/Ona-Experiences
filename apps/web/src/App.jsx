import { Routes, Route } from 'react-router-dom';
import DocumentMeta from './components/DocumentMeta.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';

function App() {
  return (
    <>
      <DocumentMeta />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lodges/:productId" element={<ProductDetailPage catalogType="lodges" />} />
        <Route path="/guides/:productId" element={<ProductDetailPage catalogType="guides" />} />
      </Routes>
    </>
  );
}

export default App;
