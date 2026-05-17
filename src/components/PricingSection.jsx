function PricingSection() {
  return (
    <section id="tarifas" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-deep">Tarifas</p>
          <h2 className="mt-3 font-display text-4xl text-slate-900">Valores comerciales a mostrar</h2>
          <p className="mt-4 text-lg text-slate-600">Se reemplazaron los precios genéricos por los valores definidos en el resumen del proyecto.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200 bg-sand p-8 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-deep">Para lodges</p>
            <h3 className="mt-3 text-3xl font-bold text-slate-900">$200.000 <span className="text-base font-medium text-slate-500">mensuales</span></h3>
            <p className="mt-3 text-slate-600">Cobro mensual entre octubre y abril, manteniendo la vitrina activa todo el año.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Publicación dentro del directorio ONA Experiences.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Desde la segunda reserva del mes: comisión de 10% sobre el valor facturado al cliente.</span></li>
            </ul>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-sand p-8 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-deep">Para guías</p>
            <h3 className="mt-3 text-3xl font-bold text-slate-900">$50.000 <span className="text-base font-medium text-slate-500">mensuales</span></h3>
            <p className="mt-3 text-slate-600">Cobro mensual entre octubre y abril, con presencia visible dentro del sitio.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Ficha individual con ubicación, contacto y especialidad.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Visibilidad dentro de las zonas cubiertas por la etapa inicial.</span></li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
