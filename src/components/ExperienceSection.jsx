import { useMemo, useState } from 'react';
import CompactMap from './CompactMap.jsx';
import { getRatingStats, renderStars } from '../utils/rating.js';

function imageUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : `/${src.replace(/^\/?/, '')}`;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function feeTextFor(item) {
  return item.type === 'Lodge'
    ? '$200.000 mensual + 10% comisión desde la segunda reserva'
    : '$50.000 mensual';
}

function ExperienceListItem({ item, ratingVersion, onSelect }) {
  const stats = getRatingStats(item, ratingVersion);

  return (
    <button type="button" onClick={() => onSelect(item)} className="experience-list-item group">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
        <img src={imageUrl(item.image)} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-slate-950">{item.name}</h3>
            <p className="mt-1 truncate text-sm text-slate-500">{item.zone}</p>
          </div>
          <div className="rounded-xl bg-slate-950 px-2.5 py-1 text-xs font-extrabold text-white">{stats.average.toFixed(1)}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rating-stars leading-none">{renderStars(stats.average)}</span>
          <span>{stats.reviews} reseñas</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block"></span>
          <span className="truncate font-semibold text-slate-700">{feeTextFor(item)}</span>
        </div>
      </div>
    </button>
  );
}

function ExperienceSection({ id, mapAnchorId, eyebrow, title, description, heroImage, heroAlt, items, ratingVersion, onSelect }) {
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('all');

  const zones = useMemo(() => ['all', ...new Set(items.map(item => item.zone))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a.localeCompare(b, 'es');
  }), [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return items.filter(item => {
      const zoneMatch = zone === 'all' || item.zone === zone;
      const textMatch = !normalizedQuery || normalizeText(`${item.name} ${item.zone} ${item.email} ${item.representative || ''}`).includes(normalizedQuery);
      return zoneMatch && textMatch;
    });
  }, [items, query, zone]);

  const heroItem = filteredItems[0] || items[0];
  const topRated = useMemo(() => {
    return [...items].sort((a, b) => b.rating - a.rating)[0];
  }, [items]);

  return (
    <section id={mapAnchorId || id} className="experience-screen scroll-mt-24 py-14 sm:py-16">
      <div id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-deep">{eyebrow}</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-slate-950 sm:text-5xl">{title}</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        </div>

        <div className="experience-layout">
          <aside className="experience-photo-card">
            <img src={imageUrl(heroImage || heroItem?.image)} alt={heroAlt || title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent"></div>
            <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
              <span className="mb-4 w-fit rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">Fly Fishing</span>
              <h3 className="font-display text-3xl leading-tight">Compara, elige y planifica con confianza.</h3>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur">
                  <p className="text-3xl font-extrabold">{items.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/75">Opciones</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur">
                  <p className="text-3xl font-extrabold">{zones.length - 1}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/75">zonas</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="experience-list-card">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">Directorio</p>
                  <h3 className="mt-1 text-2xl font-extrabold text-slate-950">{eyebrow}</h3>
                </div>
                <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-black text-deep">{filteredItems.length} visibles</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.8fr]">
                <label className="sr-only" htmlFor={`${id}-search`}>Buscar</label>
                <input id={`${id}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o zona" className="directory-input" />
                <label className="sr-only" htmlFor={`${id}-zone`}>Zona</label>
                <select id={`${id}-zone`} value={zone} onChange={(event) => setZone(event.target.value)} className="directory-input">
                  {zones.map(itemZone => <option key={itemZone} value={itemZone}>{itemZone === 'all' ? 'Todas las zonas' : itemZone}</option>)}
                </select>
              </div>
            </div>

            <div className="experience-list-scroll">
              {filteredItems.length ? filteredItems.map(item => (
                <ExperienceListItem key={`${item.type}-${item.name}`} item={item} ratingVersion={ratingVersion} onSelect={onSelect} />
              )) : (
                <div className="m-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No hay resultados para este filtro.</div>
              )}
            </div>
          </section>

          <aside className="experience-map-card">
            <div className="map-panel-header">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Mapa ONA</p>
                <h3 className="text-lg font-bold text-white">Ubicación de {eyebrow.toLowerCase()}</h3>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">{filteredItems.length} puntos</div>
            </div>
            <CompactMap items={filteredItems} ratingVersion={ratingVersion} onSelect={onSelect} ariaLabel={`Mapa de ${eyebrow}`} />
            <div className="map-panel-footer">
              <span className="inline-flex items-center gap-2"><span className="marker-dot marker-dot-lodge"></span>Lodges</span>
              <span className="inline-flex items-center gap-2"><span className="marker-dot marker-dot-guide"></span>Guías</span>
              <span className="ml-auto hidden text-slate-500 md:inline">Click en un punto para ver detalle</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default ExperienceSection;
