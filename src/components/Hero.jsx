function Hero({ zonesCount, lodgesCount, guidesCount, onNavigate }) {
  return (
    <section id="inicio" className="relative isolate min-h-[92vh] overflow-hidden bg-hero bg-cover bg-center pt-28 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,.12),rgba(2,6,23,.34))]"></div>
      <div className="mx-auto flex min-h-[calc(92vh-7rem)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/90 backdrop-blur">Patagonia · Chile</div>
          <h1 className="max-w-3xl font-display text-4xl leading-[0.98] sm:text-6xl lg:text-7xl">Tu próxima aventura de pesca comienza aquí.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">Encuentra lodges y guías seleccionados en la Patagonia chilena.</p>
          
        </div>
      </div>
    </section>
  );
}

export default Hero;
