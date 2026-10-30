import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { fetchLodgeById, fetchProductReviews } from '../api/lodges.js';
import { fetchGuideById } from '../api/guides.js';
import { mergeSingleWithSeed } from '../utils/catalogMerge.js';
import Header from '../components/Header.jsx';
import DetailPage from '../components/DetailPage.jsx';
import Footer from '../components/Footer.jsx';
import { useHeadOverride } from '../components/DocumentMeta.jsx';
import { NotFoundContent } from './NotFoundPage.jsx';
import { useLocalizedPath } from '../i18n/locale.js';
import { localizePath } from '../routes.js';
import { parseProductSlug, productSlug } from '../../shared/productSlug.ts';

const typeConfig = {
  lodges: {
    internalLabel: 'Lodge',
    seed: seedLodges,
    fetch: fetchLodgeById,
    pageId: 'lodge',
    backHash: '#lodges-section'
  },
  guides: {
    internalLabel: 'Guía',
    seed: seedGuides,
    fetch: fetchGuideById,
    pageId: 'guide',
    backHash: '#guias-section'
  }
};

function ProductDetailPage({ catalogType }) {
  const { t } = useTranslation();
  // `slug` is `{name}-{productId}` or, for old links, the bare productId.
  const { slug } = useParams();
  const productId = parseProductSlug(slug);
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { lang, homeSection } = useLocalizedPath();
  const config = typeConfig[catalogType];
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(!productId);
  const [reviews, setReviews] = useState({ average: null, count: 0, items: [] });

  const backLabel = catalogType === 'lodges' ? t('detail.back_to_lodges') : t('detail.back_to_guides');

  useEffect(() => {
    let cancelled = false;
    const { fetch, seed, internalLabel } = typeConfig[catalogType];

    async function loadItem() {
      setItem(null);
      setError(null);
      if (!productId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setNotFound(false);
      setLoading(true);
      setReviews({ average: null, count: 0, items: [] });

      try {
        const apiItem = await fetch(productId);
        if (cancelled) return;
        const enriched = mergeSingleWithSeed(apiItem, seed);
        setItem({ ...enriched, type: internalLabel });
        setReviews({
          average: apiItem.rating ?? null,
          count: Number(apiItem.reviews || 0),
          items: []
        });
        try {
          const reviewView = await fetchProductReviews(catalogType, productId);
          if (!cancelled) setReviews(reviewView);
        } catch (reviewError) {
          if (!cancelled) {
            console.error(`Failed to load ${catalogType} reviews:`, reviewError);
            setReviews({ average: null, count: 0, items: [] });
          }
        }
      } catch (loadError) {
        if (cancelled) return;
        if (loadError?.status === 404) {
          setNotFound(true);
          return;
        }
        console.error(`Failed to load ${catalogType} detail:`, loadError);
        setError(loadError instanceof Error ? loadError.message : t('detail.load_error_fallback'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [catalogType, productId, t]);

  // Old (bare id) or stale (renamed item) slugs: move to the current one without a history entry.
  const canonicalSlug = item ? productSlug({ name: item.name, productId }) : null;
  useEffect(() => {
    if (canonicalSlug && canonicalSlug !== slug) {
      navigate({ pathname: localizePath(config.pageId, lang, { slug: canonicalSlug }), hash }, { replace: true });
    }
  }, [canonicalSlug, slug, config.pageId, lang, hash, navigate]);

  useHeadOverride(notFound ? { notFound: true } : item ? { item } : null);

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main>
        {loading ? (
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-44 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              {t('detail.loading')}
            </div>
          </div>
        ) : null}

        {!loading && notFound ? <NotFoundContent /> : null}

        {!loading && error ? (
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-44 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-red-200 bg-white p-12 text-center">
              <p className="text-lg font-semibold text-slate-900">{t('detail.load_error_title')}</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <Link
                to={homeSection(config.backHash)}
                className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {backLabel}
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && item ? (
          <DetailPage
            item={item}
            catalogType={catalogType}
            productId={productId}
            reviews={reviews}
            onBack={() => navigate(homeSection(config.backHash))}
            onNavigate={(sectionId) => navigate(homeSection(sectionId))}
          />
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

export default ProductDetailPage;
