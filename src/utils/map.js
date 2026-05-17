import L from 'leaflet';
import { getRatingStats, renderStars } from './rating.js';

export function createMarkerIcon(type) {
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker ${type === 'Lodge' ? 'lodge' : 'guia'}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
}
export function popupTemplate(item, ratingVersion) {
  const stats = getRatingStats(item, ratingVersion);
  return `
    <div>
      <div class="popup-image" style="background-image:url('${item.image}')"></div>
      <span class="popup-badge ${item.type === 'Lodge' ? 'lodge' : 'guia'}">${item.type}</span>
      <h3 style="margin:10px 0 6px;font-size:18px;font-weight:800;color:#0f172a;line-height:1.25;">${item.name}</h3>
      <div class="popup-rating"><span>${renderStars(stats.average)}</span><strong>${stats.average.toFixed(1)}</strong><small>(${stats.reviews} reseñas)</small></div>
      <p style="margin:0 0 8px;color:#475569;font-size:13px;"><strong>Zona:</strong> ${item.zone}</p>
      ${item.representative ? `<p style="margin:0 0 8px;color:#475569;font-size:13px;"><strong>Representante:</strong> ${item.representative}</p>` : ''}
      <p style="margin:0 0 5px;color:#475569;font-size:13px;"><strong>Teléfono:</strong> ${item.phone || 'No informado'}</p>
      <p style="margin:0;color:#475569;font-size:13px;word-break:break-word;"><strong>Email:</strong> ${item.email || 'No informado'}</p>
    </div>
  `;
}
