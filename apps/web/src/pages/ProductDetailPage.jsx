import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import L from 'leaflet';
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { fetchLodgeById } from '../api/lodges.js';
import { fetchGuideById } from '../api/guides.js';
import { mergeSingleWithSeed } from '../utils/catalogMerge.js';
import { saveUserRating, getRatingStats, renderStars } from '../utils/rating.js';
import { createMarkerIcon } from '../utils/map.js';
import Header from '../components/Header.jsx';
import GalleryStrip from '../components/GalleryStrip.jsx';
import RatingPanel from '../components/RatingPanel.jsx';
import QuoteRequestForm from '../components/QuoteRequestForm.jsx';
import Footer from '../components/Footer.jsx';

const typeConfig = {
  lodges: {
    label: 'Lodge',
    seed: seedLodges,
    fetch: fetchLodgeById,
    backHash: '#lodges-section',
    backLabel: 'Volver a lodges',
    feeText: '$200.000 mensual + 10% comisión desde la segunda reserva'
  },
  guides: {
    label: 'Guía',
    seed: seedGuides,
    fetch: fetchGuideById,
    backHash: '#guias-section',
    backLabel: 'Volver a guías',
    feeText: '$50.000 mensual'
  }
};

function ProductDetailPage({ catalogType }) {
  const { productId } = useParams();
  const config = typeConfig[catalogType];
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingVersion, setRatingVersion] = useState(0);
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);

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

  useEffect(() => {
    if (!item || typeof item.lat !== 'number' || typeof item.lng !== 'number' || !mapElementRef.current) {
      return undefined;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapElementRef.current, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([item.lat, item.lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker([item.lat, item.lng], {
      icon: createMarkerIcon(item.type)
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [item]);

  function handleRate(ratedItem, score) {
    saveUserRating(ratedItem, score);
    setRatingVersion(version => version + 1);
  }

  const stats = item ? getRatingStats(item, ratingVersion) : null;
  const gallery = item && Array.isArray(item.gallery) ? item.gallery : item?.image ? [item.image] : [];

  return (
    <div className="bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            to={{ pathname: '/', hash: config.backHash }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-deep transition hover:text-slate-900"
          >
            <span aria-hidden="true">&larr;</span>
            {config.backLabel}
          </Link>

          {loading ? (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Cargando detalle…
            </div>
          ) : null}

          {!loading && error ? (
            <div className="mt-10 rounded-3xl border border-red-200 bg-white p-12 text-center">
              <p className="text-lg font-semibold text-slate-900">No se pudo cargar este producto</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <Link
                to={{ pathname: '/', hash: config.backHash }}
                className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {config.backLabel}
              </Link>
            </div>
          ) : null}

          {!loading && item ? (
            <article className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-card">
              <div className="relative h-72 overflow-hidden bg-slate-200 sm:h-96">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${item.image}')` }}
                ></div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/75 to-transparent"></div>
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">{item.type}</span>
                  <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{item.zone}</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
                  <div>
                    <div className="rating-stars text-sm leading-none">{renderStars(stats.average)}</div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.ratingLabel || 'Muy recomendado'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold leading-none text-slate-900">{stats.average.toFixed(1)}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{stats.reviews} reseñas</p>
                  </div>
                </div>
              </div>

              <GalleryStrip item={item} />

              <div className="p-6 sm:p-8">
                <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{item.name}</h1>
                {item.representative ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Representante: <span className="font-medium text-slate-700">{item.representative}</span>
                  </p>
                ) : null}

                <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Teléfono:</span> {item.phone || 'No informado'}</p>
                  <p className="mt-2 contact-link"><span className="font-semibold text-slate-900">Email:</span> {item.email || 'No informado'}</p>
                  <p className="mt-2"><span className="font-semibold text-slate-900">Zona:</span> {item.zone}</p>
                </div>

                {typeof item.lat === 'number' && typeof item.lng === 'number' ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ubicación</p>
                    <div ref={mapElementRef} className="mt-3 h-64 overflow-hidden rounded-2xl border border-slate-200"></div>
                  </div>
                ) : null}

                {gallery.length > 4 ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Galería completa</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {gallery.map((image, index) => (
                        <div
                          key={`${item.name}-gallery-${index}`}
                          className="aspect-[4/3] rounded-2xl bg-cover bg-center"
                          style={{ backgroundImage: `url('${image}')` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 border-t border-slate-200 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tarifa visible</p>
                  <p className="mt-2 text-base font-bold text-slate-900">{config.feeText}</p>
                </div>

                <QuoteRequestForm
                  catalogType={catalogType}
                  productId={productId}
                  productName={item.name}
                />

                <RatingPanel item={item} ratingVersion={ratingVersion} onRate={handleRate} />
              </div>
            </article>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ProductDetailPage;
