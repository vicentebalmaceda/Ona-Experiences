import { lodges, guides } from '../data.js';

function Hero({ zones, filters, setFilters, applyFilters, summary }) {
  return (
    <section id="inicio" className="bg-hero bg-cover bg-center pt-28 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/90 backdrop-blur">Directorio premium · Patagonia · Chile</div>
          <h1 className="max-w-3xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">Un mapa real y profesional para mostrar dónde está cada lodge y cada guía.</h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-200 sm:text-xl">Diseño pensado para venta: visual limpio, navegación simple y foco en las zonas actualmente cubiertas por ONA Experiences.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#mapa-section" className="rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200">Ver mapa</a>
            <a href="#lodges-section" className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Explorar oferta</a>
          </div>
          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-3xl font-bold">{zones.length - 1}</p><p className="mt-1 text-sm text-slate-200">zonas activas</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-3xl font-bold">{lodges.length}</p><p className="mt-1 text-sm text-slate-200">lodges</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-3xl font-bold">{guides.length}</p><p className="mt-1 text-sm text-slate-200">guías</p></div>
          </div>
        </div>

        <div className="self-end rounded-[30px] border border-white/10 bg-white/95 p-6 text-slate-900 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-deep">Directorio inicial</p>
              <h2 className="mt-1 text-2xl font-bold">Filtra por zona y tipo</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pro</span>
          </div>
          <form onSubmit={applyFilters} className="mt-5 space-y-4">
            <div>
              <label htmlFor="zoneFilter" className="mb-2 block text-sm font-medium text-slate-700">Zona</label>
              <select id="zoneFilter" value={filters.zone} onChange={(event) => setFilters(prev => ({ ...prev, zone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-deep focus:ring-2 focus:ring-deep/20">
                {zones.map(zone => <option key={zone} value={zone}>{zone === 'all' ? 'Todas las zonas' : zone}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="typeFilter" className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
              <select id="typeFilter" value={filters.type} onChange={(event) => setFilters(prev => ({ ...prev, type: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-deep focus:ring-2 focus:ring-deep/20">
                <option value="all">Todos</option>
                <option value="Lodge">Lodges</option>
                <option value="Guía">Guías</option>
              </select>
            </div>
            <div>
              <label htmlFor="searchInput" className="mb-2 block text-sm font-medium text-slate-700">Buscar por nombre</label>
              <input id="searchInput" type="text" value={filters.text} onChange={(event) => setFilters(prev => ({ ...prev, text: event.target.value }))} placeholder="Ej: Coyhaique, Futaleufú, Puelo" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-deep focus:ring-2 focus:ring-deep/20" />
            </div>
            <button type="submit" className="w-full rounded-2xl bg-deep px-5 py-3.5 font-semibold text-white transition hover:bg-deep/90">Aplicar filtros</button>
          </form>
          <p className="mt-4 text-sm text-slate-600">{summary}</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
