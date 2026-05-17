import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createMarkerIcon, popupTemplate } from '../utils/map.js';

function MapSection({ zones, allItems, filteredItems, filters, setFilters, resetFilters, ratingVersion }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    mapRef.current = L.map(mapElementRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([-45.5, -72.5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

    setTimeout(() => mapRef.current?.invalidateSize(), 150);

    let resizeObserver;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => mapRef.current?.invalidateSize());
      resizeObserver.observe(mapElementRef.current);
    }

    return () => {
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

    filteredItems.forEach(item => {
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;

      const marker = L.marker([item.lat, item.lng], {
        icon: createMarkerIcon(item.type)
      }).bindPopup(popupTemplate(item, ratingVersion), { className: 'custom-popup' });

      marker.on('click', () => {
        const target = item.type === 'Lodge' ? 'lodges-section' : 'guias-section';
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      marker.addTo(markerLayer);
      bounds.push([item.lat, item.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 8);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView([-45.5, -72.5], 5);
    }
  }, [filteredItems, ratingVersion]);

  return (
    <section id="mapa-section" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-deep">Mapa interactivo</p>
          <h2 className="mt-3 font-display text-4xl text-slate-900">Ubicación visual clara, seria y fácil de usar</h2>
          <p className="mt-4 text-lg text-slate-600">Este mapa usa una base real para que el usuario pueda entender mejor dónde está cada punto. Los marcadores se vinculan con los listados de lodges y guías.</p>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[0.38fr_0.62fr]">
          <aside className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Zonas cubiertas</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Haz clic en una zona para filtrar el mapa y los listados.</p>
              </div>
              <button onClick={resetFilters} className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Ver todas</button>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/70 p-3">
              <div className="zone-grid">
                {zones.filter(zone => zone !== 'all').map(zone => {
                  const count = allItems.filter(item => item.zone === zone).length;
                  return (
                    <button key={zone} className={`zone-chip ${filters.zone === zone ? 'active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, zone }))}>
                      <span className="zone-chip__label">{zone}</span>
                      <span className="zone-chip__count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-mist p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-deep">Cómo usarlo</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Haz clic en un pin para ver el detalle y el tipo de operación.</span></li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Usa las zonas o filtros para mostrar solo una parte del territorio.</span></li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Los datos se dejaron con la información entregada, sin inventar contactos adicionales.</span></li>
              </ul>
            </div>
          </aside>

          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-4 shadow-soft">
            <div className="map-header mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-slate-950 px-4 py-3 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Mapa ONA</p>
                <h3 className="text-lg font-semibold">Lodges y guías en el sur de Chile</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span className="marker-dot marker-dot-lodge"></span>Lodges</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span className="marker-dot marker-dot-guide"></span>Guías</span>
              </div>
            </div>
            <div className="map-shell"><div ref={mapElementRef} id="map" className="w-full rounded-[24px]"></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MapSection;
