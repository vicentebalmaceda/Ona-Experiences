function Hero({ zonesCount, lodgesCount, guidesCount, onNavigate }) {
  return (
    <section id="inicio" className="relative isolate min-h-[92vh] overflow-hidden bg-hero bg-cover bg-center pt-28 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,.12),rgba(2,6,23,.34))]"></div>
      <div className="mx-auto flex min-h-[calc(92vh-7rem)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/90 backdrop-blur">Directorio premium · Patagonia · Chile</div>
          <h1 className="max-w-3xl font-display text-4xl leading-[0.98] sm:text-6xl lg:text-7xl">Un mapa real y profesional para mostrar dónde está cada lodge y cada guía.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">Diseño pensado para venta: visual limpio, navegación simple y foco en las zonas actualmente cubiertas por ONA Experiences.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button type="button" onClick={() => onNavigate('mapa-section')} className="rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200">Ver mapa</button>
            <button type="button" onClick={() => onNavigate('lodges-section')} className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Explorar oferta</button>
          </div>
          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-3xl font-bold">{zonesCount}</p><p className="mt-1 text-sm text-slate-200">zonas activas</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-3xl font-bold">{lodgesCount}</p><p className="mt-1 text-sm text-slate-200">lodges</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-3xl font-bold">{guidesCount}</p><p className="mt-1 text-sm text-slate-200">guías</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
