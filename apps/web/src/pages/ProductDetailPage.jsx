import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLodgeById, fetchProductReviews } from '../api/lodges.js';
import { fetchGuideById } from '../api/guides.js';
import Header from '../components/Header.jsx';
import DetailPage from '../components/DetailPage.jsx';
import Footer from '../components/Footer.jsx';
import { useHeadOverride } from '../components/DocumentMeta.jsx';
import { NotFoundContent } from './NotFoundPage.jsx';
import { useLocalizedPath } from '../i18n/locale.js';
import { localizePath } from '../routes.js';
import { parseProductSlug, productSlug } from '../../shared/productSlug.ts';
import { useInitialData } from '../site/initialData.js';
import { CATALOG_TYPES, detailItem, EMPTY_REVIEWS, initialDetailFor, sameData } from '../site/pageData.js';

const typeConfig = {
  lodges: {
    fetch: fetchLodgeById,
    pageId: CATALOG_TYPES.lodges.pageId,
    backHash: '#lodges-section'
  },
  guides: {
    fetch: fetchGuideById,
    pageId: CATALOG_TYPES.guides.pageId,
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
  const { data, ssr } = useInitialData();
  // Prerendered page: the item, its reviews and the sanitized description come
  // embedded, so the first render is the final page (and matches the HTML).
  const initial = initialDetailFor(data, catalogType, productId);
  const [item, setItem] = useState(() => (initial ? detailItem(initial.item, catalogType) : null));
  const [loading, setLoading] = useState(!initial && Boolean(productId) && !ssr);
  const [error, setError] = useState(null);
  // On the server, a product without embedded data is not part of the catalog.
  const [notFound, setNotFound] = useState(!productId || (ssr && !initial));
  const [reviews, setReviews] = useState(() => initial?.reviews ?? EMPTY_REVIEWS);
  const prerenderedDescription = initial
    ? { source: initial.item.description, html: initial.descriptionHtml ?? '' }
    : null;
  const itemRef = useRef(item);
  itemRef.current = item;

  const backLabel = catalogType === 'lodges' ? t('detail.back_to_lodges') : t('detail.back_to_guides');

  useEffect(() => {
    let cancelled = false;
    const { fetch } = typeConfig[catalogType];
    // Revalidating what is already on screen (prerendered or a previous load):
    // keep it while fetching and swap only what changed, so nothing flickers.
    const current = itemRef.current;
    const revalidating = Boolean(current) && String(current.productId) === String(productId);

    async function loadItem() {
      setError(null);
      if (!productId) {
        setItem(null);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setNotFound(false);
      if (!revalidating) {
        setItem(null);
        setLoading(true);
        setReviews(EMPTY_REVIEWS);
      }

      try {
        const apiItem = await fetch(productId);
        if (cancelled) return;
        const next = detailItem(apiItem, catalogType);
        setItem((previous) => (sameData(previous, next) ? previous : next));
        if (!revalidating) {
          setReviews({
            average: apiItem.rating ?? null,
            count: Number(apiItem.reviews || 0),
            items: []
          });
        }
        try {
          const reviewView = await fetchProductReviews(catalogType, productId);
          if (!cancelled) setReviews((previous) => (sameData(previous, reviewView) ? previous : reviewView));
        } catch (reviewError) {
          if (!cancelled) {
            console.error(`Failed to load ${catalogType} reviews:`, reviewError);
            if (!revalidating) setReviews(EMPTY_REVIEWS);
          }
        }
      } catch (loadError) {
        if (cancelled) return;
        if (loadError?.status === 404) {
          setItem(null);
          setNotFound(true);
          return;
        }
        console.error(`Failed to load ${catalogType} detail:`, loadError);
        // A failed revalidation keeps the prerendered page.
        if (!revalidating) {
          setError(loadError instanceof Error ? loadError.message : t('detail.load_error_fallback'));
        }
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

  useHeadOverride(notFound ? { notFound: true } : item ? { item, reviews } : null);

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
            prerenderedDescription={prerenderedDescription}
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
