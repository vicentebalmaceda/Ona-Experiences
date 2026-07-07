import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { fetchLodgeById } from '../api/lodges.js';
import { fetchGuideById } from '../api/guides.js';
import { mergeSingleWithSeed } from '../utils/catalogMerge.js';
import { saveUserRating } from '../utils/rating.js';
import Header from '../components/Header.jsx';
import DetailPage from '../components/DetailPage.jsx';
import Footer from '../components/Footer.jsx';

const typeConfig = {
  lodges: {
    label: 'Lodge',
    seed: seedLodges,
    fetch: fetchLodgeById,
    backHash: '#lodges-section',
    backLabel: 'Volver a lodges'
  },
  guides: {
    label: 'Guía',
    seed: seedGuides,
    fetch: fetchGuideById,
    backHash: '#guias-section',
    backLabel: 'Volver a guías'
  }
};

function ProductDetailPage({ catalogType }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const config = typeConfig[catalogType];
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingVersion, setRatingVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const { fetch, seed, label } = typeConfig[catalogType];

    async function loadItem() {
      setLoading(true);
      setError(null);
      setItem(null);

      try {
        const apiItem = await fetch(productId);
        if (cancelled) return;
        const enriched = mergeSingleWithSeed(apiItem, seed);
        setItem({ ...enriched, type: label });
      } catch (loadError) {
        if (cancelled) return;
        console.error(`Failed to load ${catalogType} detail:`, loadError);
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el producto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [catalogType, productId]);

  function handleRate(ratedItem, score) {
    saveUserRating(ratedItem, score);
    setRatingVersion(version => version + 1);
  }

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main>
        {loading ? (
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Cargando detalle…
            </div>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-red-200 bg-white p-12 text-center">
              <p className="text-lg font-semibold text-slate-900">No se pudo cargar este producto</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <Link
                to={{ pathname: '/', hash: config.backHash }}
                className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {config.backLabel}
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && item ? (
          <DetailPage
            item={item}
            catalogType={catalogType}
            productId={productId}
            ratingVersion={ratingVersion}
            onRate={handleRate}
            onBack={() => navigate({ pathname: '/', hash: config.backHash })}
            onNavigate={(sectionId) => navigate({ pathname: '/', hash: `#${sectionId}` })}
          />
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

export default ProductDetailPage;
