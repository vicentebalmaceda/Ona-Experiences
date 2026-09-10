import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import CompactMap from './CompactMap.jsx';
import GalleryStrip from './GalleryStrip.jsx';
import PhotoLightbox from './PhotoLightbox.jsx';
import QuoteRequestForm from './QuoteRequestForm.jsx';
import { getRatingStats, renderStars } from '../utils/rating.js';
import { getReferencePrice } from '../utils/referencePrice.js';

const DESCRIPTION_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'br', 'a',
  'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
];
const DESCRIPTION_ALLOWED_ATTR = ['href', 'target', 'rel'];

function imageUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : `/${src.replace(/^\/?/, '')}`;
}

function uniqueImageUrls(sources) {
  const seen = new Set();
  const urls = [];
  for (const src of sources) {
    const url = imageUrl(src);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function normalizedPhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

/** Sanitize BSale market_info HTML so tags and Spanish entities render safely. */
function sanitizeMarketDescription(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DESCRIPTION_ALLOWED_TAGS,
    ALLOWED_ATTR: DESCRIPTION_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim();
}

function displayTypeLabel(type, t) {
  return type === 'Lodge' ? t('types.lodge') : t('types.guide');
}

function DetailPage({ item, catalogType, productId, reviews, onBack, onNavigate }) {
  const { t } = useTranslation();
  const stats = getRatingStats(item);
  const visibleReviews = reviews?.items ?? [];
  const referencePrice = getReferencePrice(item);
  const gallery = item.gallery?.length ? item.gallery : [item.image];
  const uniqueGallery = useMemo(
    () => uniqueImageUrls([...(gallery || []), item.image]),
    [item.gallery, item.image]
  );
  const phone = normalizedPhone(item.phone);
  const descriptionHtml = useMemo(
    () => sanitizeMarketDescription(item.description),
    [item.description]
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(src) {
    const index = uniqueGallery.indexOf(imageUrl(src));
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  }

  const typeLabel = displayTypeLabel(item.type, t);

  return (
    <section className="detail-page min-h-screen pt-32">
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
            <span aria-hidden="true">←</span> {t('detail.back')}
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate(item.type === 'Lodge' ? 'lodges-section' : 'guias-section')} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              {item.type === 'Lodge' ? t('detail.see_other_lodges') : t('detail.see_other_guides')}
            </button>
            <button type="button" onClick={() => onNavigate('contacto')} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">{t('detail.contact_ona')}</button>
          </div>
        </div>

        <div className="detail-title-card">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-deep/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-deep">{typeLabel}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-600">{item.zone}</span>
            </div>
            <h1 className="font-display text-4xl leading-tight text-slate-950 sm:text-6xl">{item.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{t('detail.intro')}</p>
          </div>
          <div className="detail-rating-box">
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{t('detail.rating')}</p>
              <p className="mt-1 text-4xl font-black text-slate-950">
                {stats.average != null ? stats.average.toFixed(1) : '—'}
              </p>
            </div>
            <div>
              <p className="rating-stars text-xl leading-none">{renderStars(stats.average)}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {stats.reviews > 0
                  ? t('detail.reviews_registered', { count: stats.reviews })
                  : t('rating.none')}
              </p>
            </div>
          </div>
        </div>

        {uniqueGallery.length ? (
          <div className="detail-gallery mt-7" data-count={Math.min(uniqueGallery.length, 5)}>
            <button
              type="button"
              className="detail-gallery-main"
              style={{ backgroundImage: `url('${uniqueGallery[0]}')` }}
              onClick={() => openLightbox(uniqueGallery[0])}
              aria-label={t('detail.view_photo', { index: 1, name: item.name })}
            />
            {uniqueGallery.slice(1, 5).map((src, index) => (
              <button
                type="button"
                key={src}
                className="detail-gallery-thumb"
                style={{ backgroundImage: `url('${src}')` }}
                onClick={() => openLightbox(src)}
                aria-label={t('detail.view_photo', { index: index + 2, name: item.name })}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-6">
            <section className="detail-content-card">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">{t('detail.summary')}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{t('detail.profile_review')}</h2>
                </div>
                {stats.reviews > 0 ? (
                  <span className="rounded-full bg-mist px-4 py-2 text-sm font-black text-deep">{t('detail.highly_recommended')}</span>
                ) : null}
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div className="detail-fact"><span>{t('detail.type')}</span><strong>{typeLabel}</strong></div>
                <div className="detail-fact"><span>{t('detail.zone')}</span><strong>{item.zone}</strong></div>
                {referencePrice ? (
                  <div className="detail-fact"><span>{t('detail.reference_price')}</span><strong>{referencePrice}</strong></div>
                ) : null}
              </div>
              {descriptionHtml ? (
                <div
                  className="detail-description mt-6 text-base leading-8 text-slate-600"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="mt-6 text-base leading-8 text-slate-600">{t('detail.fallback_description', { name: item.name, zone: item.zone })}</p>
              )}
              {item.representative ? (
                <p className="mt-4 text-base leading-8 text-slate-600">
                  {t('detail.representative_label')}{' '}
                  <span className="font-bold text-slate-900">{item.representative}</span>.
                </p>
              ) : null}
            </section>

            <section className="detail-content-card">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">{t('detail.map')}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{t('detail.location')}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t('detail.map_hint')}</p>
                  <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
                    <p><span className="font-bold text-slate-950">{t('detail.phone')}</span> {item.phone || t('detail.not_informed')}</p>
                    <p className="mt-2 break-words"><span className="font-bold text-slate-950">{t('detail.email')}</span> {item.email || t('detail.not_informed')}</p>
                    {typeof item.lat === 'number' && typeof item.lng === 'number' ? (
                      <p className="mt-2"><span className="font-bold text-slate-950">{t('detail.coordinates')}</span> {item.lat}, {item.lng}</p>
                    ) : null}
                  </div>
                </div>
                <div className="detail-map-shell">
                  <CompactMap items={[item]} onSelect={() => {}} ariaLabel={t('detail.map_aria', { name: item.name })} />
                </div>
              </div>
            </section>

            <section className="detail-content-card">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">{t('detail.comments_eyebrow')}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{t('detail.comments_title')}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="review-summary-card">
                  <span>★</span>
                  <strong>{stats.average != null ? `${stats.average.toFixed(1)} / 5` : '—'}</strong>
                  <p>{t('detail.avg_visible')}</p>
                </div>
                <div className="review-summary-card">
                  <span>✓</span>
                  <strong>{t('rating.reviews_count', { count: stats.reviews })}</strong>
                  <p>{stats.reviews > 0 ? t('detail.reviews_visible') : t('rating.none')}</p>
                </div>
              </div>
              {visibleReviews.length ? (
                <ul className="mt-6 space-y-4">
                  {visibleReviews.map((review) => (
                    <li key={review.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-slate-950">{review.displayName}</p>
                        <p className="rating-stars text-sm">{renderStars(review.rating)}</p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-sm leading-6 text-slate-500">{t('detail.no_reviews_yet')}</p>
              )}
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">{t('detail.before_booking_title')}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t('detail.before_booking_text')}</p>
              </div>
            </section>

            <section className="detail-content-card overflow-hidden p-0">
              <GalleryStrip item={item} />
            </section>
          </div>

          <aside className="booking-panel">
            <div className="booking-panel__inner">
              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">{t('detail.agenda')}</p>
                <h2 className="mt-2 text-2xl font-black">{t('detail.request_availability')}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{t('detail.quote_via_bsale')}</p>
              </div>

              {referencePrice ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t('detail.reference_price')}</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{referencePrice}</p>
                </div>
              ) : null}

              <QuoteRequestForm
                catalogType={catalogType}
                productId={productId}
                productName={item.name}
              />

              {phone ? (
                <a href={`tel:${phone}`} className="mt-3 block rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center font-black text-slate-900 transition hover:bg-slate-50">
                  {t('detail.call_contact')}
                </a>
              ) : null}
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">{t('detail.quote_no_confirm')}</p>
            </div>
          </aside>
        </div>
      </div>

      <PhotoLightbox
        images={uniqueGallery}
        index={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
        alt={item.name}
      />
    </section>
  );
}

export default DetailPage;
