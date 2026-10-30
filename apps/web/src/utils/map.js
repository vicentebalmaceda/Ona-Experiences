import { formatRating, getRatingStats, renderStars } from './rating.js';
import { responsiveImage } from './responsiveImage.js';

/** Smallest WebP variant for bundled photos (the popup is ~250px wide), else the URL as is. */
function popupImageUrl(src) {
  const { src: url, srcSet } = responsiveImage(src);
  return srcSet ? srcSet.split(' ')[0] : url;
}

/**
 * `L` is the lazily loaded Leaflet namespace (see utils/leafletLoader.js).
 * The 18px dot sits centred in a 24px hit area (WCAG target size).
 */
export function createMarkerIcon(L, type) {
  return L.divIcon({
    className: 'custom-marker-hit',
    html: `<div class="custom-marker ${type === 'Lodge' ? 'lodge' : 'guia'}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

/** Gives a marker (role=button in Leaflet) an accessible name once it is on the map. */
export function labelMarker(marker, label) {
  const element = marker.getElement?.();
  if (element && label) element.setAttribute('aria-label', String(label));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function popupTemplate(item, ratingVersion, labels = {}, { showContact = true } = {}) {
  const stats = getRatingStats(item);
  const detailPath = item.productId
    ? item.type === 'Lodge'
      ? `/lodges/${item.productId}`
      : `/guides/${item.productId}`
    : null;
  const typeLabel = escapeHtml(labels.typeLabel || item.type);
  const notInformed = escapeHtml(labels.notInformed || 'No informado');
  const zoneLabel = escapeHtml(labels.zone || 'Zona:');
  const representativeLabel = escapeHtml(labels.representative || 'Representante:');
  const phoneLabel = escapeHtml(labels.phone || 'Teléfono:');
  const emailLabel = escapeHtml(labels.email || 'Email:');
  const reviewsLabel = escapeHtml(labels.reviews || `(${stats.reviews} reseñas)`);
  const viewDetail = escapeHtml(labels.viewDetail || 'Ver detalle →');
  const detailLink = detailPath
    ? `<a href="${detailPath}" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:#0f766e;text-decoration:none;">${viewDetail}</a>`
    : '';

  return `
    <div>
      <div class="popup-image" style="background-image:url('${escapeHtml(popupImageUrl(item.image))}')"></div>
      <span class="popup-badge ${item.type === 'Lodge' ? 'lodge' : 'guia'}">${typeLabel}</span>
      <h3 style="margin:10px 0 6px;font-size:18px;font-weight:800;color:#0f172a;line-height:1.25;">${escapeHtml(item.name)}</h3>
      <div class="popup-rating">${
        stats.average != null
          ? `<span>${renderStars(stats.average)}</span><strong>${escapeHtml(formatRating(stats.average))}</strong><small>${reviewsLabel}</small>`
          : `<small>${escapeHtml(labels.noReviews || 'Sin reseñas')}</small>`
      }</div>
      <p style="margin:0 0 8px;color:#475569;font-size:13px;"><strong>${zoneLabel}</strong> ${escapeHtml(labels.zoneName ?? item.zone)}</p>
      ${item.representative ? `<p style="margin:0 0 8px;color:#475569;font-size:13px;"><strong>${representativeLabel}</strong> ${escapeHtml(item.representative)}</p>` : ''}
      ${showContact ? `<p style="margin:0 0 5px;color:#475569;font-size:13px;"><strong>${phoneLabel}</strong> ${escapeHtml(item.phone || notInformed)}</p>
      <p style="margin:0;color:#475569;font-size:13px;word-break:break-word;"><strong>${emailLabel}</strong> ${escapeHtml(item.email || notInformed)}</p>` : ''}
      ${detailLink}
    </div>
  `;
}
