import { useState } from 'react';
import { Link } from 'react-router-dom';

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/#inicio" className="flex items-center gap-3">
          <img src="/assets/logo-ona.png" alt="ONA Experiences" className="h-12 w-12 rounded-full bg-white/90 object-contain p-1.5 shadow-soft" />
          <div>
            <p className="font-display text-lg text-white">ONA Experiences</p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Fly Fishing Chile</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          <Link to="/#mapa-section" className="hover:text-white">Mapa</Link>
          <Link to="/#lodges-section" className="hover:text-white">Lodges</Link>
          <Link to="/#guias-section" className="hover:text-white">Guías</Link>
          <Link to="/#tarifas" className="hover:text-white">Tarifas</Link>
          <Link to="/#contacto" className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200">Contacto</Link>
        </nav>
        <button onClick={() => setOpen(!open)} className="rounded-xl border border-white/15 p-2 text-white md:hidden" aria-label="Abrir menú">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <div className={`${open ? 'block' : 'hidden'} border-t border-white/10 bg-slate-950/95 md:hidden`}>
        <div className="space-y-1 px-4 py-4 text-sm text-slate-200">
          <Link to="/#mapa-section" className="block rounded-lg px-3 py-2 hover:bg-white/5">Mapa</Link>
          <Link to="/#lodges-section" className="block rounded-lg px-3 py-2 hover:bg-white/5">Lodges</Link>
          <Link to="/#guias-section" className="block rounded-lg px-3 py-2 hover:bg-white/5">Guías</Link>
          <Link to="/#tarifas" className="block rounded-lg px-3 py-2 hover:bg-white/5">Tarifas</Link>
          <Link to="/#contacto" className="block rounded-lg bg-white px-3 py-2 font-semibold text-slate-900">Contacto</Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
