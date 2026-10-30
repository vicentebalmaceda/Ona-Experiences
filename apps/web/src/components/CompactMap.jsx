import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { createMarkerIcon, popupTemplate } from '../utils/map.js';
import { useLocale } from '../i18n/locale.js';
import { getRatingStats } from '../utils/rating.js';
import { zoneLabel } from '../utils/zones.js';

function CompactMap({ items, ratingVersion, onSelect, ariaLabel, showContact = true }) {
  const { t } = useTranslation();
  const lang = useLocale();
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const resolvedAriaLabel = ariaLabel || t('map.aria_default');

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    mapRef.current = L.map(mapElementRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true
    }).setView([-45.5, -72.5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const invalidate = () => mapRef.current?.invalidateSize();
    setTimeout(invalidate, 120);
    window.addEventListener('resize', invalidate);

    let resizeObserver;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(invalidate);
      resizeObserver.observe(mapElementRef.current);
    }

    return () => {
      window.removeEventListener('resize', invalidate);
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const bounds = [];

    items.forEach(item => {
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;

      const stats = getRatingStats(item);
      const labels = {
        typeLabel: item.type === 'Lodge' ? t('types.lodge') : t('types.guide'),
        notInformed: t('map.not_informed'),
        zone: t('map.zone'),
        zoneName: zoneLabel(item.zone, t),
        representative: t('map.representative'),
        phone: t('map.phone'),
        email: t('map.email'),
        reviews: t('map.reviews', { count: stats.reviews }),
        noReviews: t('rating.none'),
        viewDetail: t('common.view_detail'),
        viewDetailName: t('common.view_detail_name', { name: item.name })
      };

      const marker = L.marker([item.lat, item.lng], {
        icon: createMarkerIcon(item.type)
      }).bindPopup(popupTemplate(item, ratingVersion, labels, { showContact, lang }), { className: 'custom-popup' });

      marker.on('click', () => onSelect?.(item));
      marker.addTo(markerLayer);
      bounds.push([item.lat, item.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 9);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 8 });
    } else {
      map.setView([-45.5, -72.5], 5);
    }

    // The map may be removed (StrictMode remount, unmount, effect re-run) before
    // this fires; clear it on cleanup and only act on the map that is still live.
    const timer = setTimeout(() => {
      if (mapRef.current === map) map.invalidateSize();
    }, 80);
    return () => clearTimeout(timer);
  }, [items, ratingVersion, onSelect, t, showContact, lang]);

  return <div ref={mapElementRef} className="interactive-map" role="region" aria-label={resolvedAriaLabel}></div>;
}

export default CompactMap;
