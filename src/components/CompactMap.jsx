import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createMarkerIcon, popupTemplate } from '../utils/map.js';

function CompactMap({ items, ratingVersion, onSelect, ariaLabel = 'Mapa interactivo' }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

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

      const marker = L.marker([item.lat, item.lng], {
        icon: createMarkerIcon(item.type)
      }).bindPopup(popupTemplate(item, ratingVersion), { className: 'custom-popup' });

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

    setTimeout(() => map.invalidateSize(), 80);
  }, [items, ratingVersion, onSelect]);

  return <div ref={mapElementRef} className="interactive-map" role="region" aria-label={ariaLabel}></div>;
}

export default CompactMap;
