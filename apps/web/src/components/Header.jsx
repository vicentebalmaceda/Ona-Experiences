import { useState } from 'react';
import { Link } from 'react-router-dom';

const links = [
  { label: 'Mapa', section: 'mapa-section' },
  { label: 'Lodges', section: 'lodges-section' },
  { label: 'Guías', section: 'guias-section' },
  { label: 'Tarifas', section: 'tarifas' }
];

function Header({ onNavigate }) {
  const [open, setOpen] = useState(false);

  function goTo(section) {
    setOpen(false);
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    window.location.href = `/#${section}`;
  }

  const LogoWrapper = onNavigate ? 'button' : Link;
  const logoProps = onNavigate
    ? { type: 'button', onClick: () => goTo('inicio'), className: 'flex items-center gap-3 text-left' }
    : { to: '/#inicio', className: 'flex items-center gap-3' };

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <LogoWrapper {...logoProps}>
          <img src="/assets/logo-ona.png" alt="ONA Experiences" className="h-12 w-12 rounded-full bg-white/90 object-contain p-1.5 shadow-soft" />
          <div>
            <p className="font-display text-lg text-white">ONA Experiences</p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Fly Fishing Chile</p>
          </div>
        </LogoWrapper>
        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          {links.map(link => (
            onNavigate ? (
              <button key={link.section} type="button" onClick={() => goTo(link.section)} className="transition hover:text-white">{link.label}</button>
            ) : (
              <Link key={link.section} to={`/#${link.section}`} className="hover:text-white">{link.label}</Link>
            )
          ))}
          {onNavigate ? (
            <button type="button" onClick={() => goTo('contacto')} className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200">Contacto</button>
          ) : (
            <Link to="/#contacto" className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200">Contacto</Link>
          )}
        </nav>
        <button onClick={() => setOpen(!open)} className="rounded-xl border border-white/15 p-2 text-white md:hidden" aria-label="Abrir menú">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <div className={`${open ? 'block' : 'hidden'} border-t border-white/10 bg-slate-950/95 md:hidden`}>
        <div className="space-y-1 px-4 py-4 text-sm text-slate-200">
          {links.map(link => (
            onNavigate ? (
              <button key={link.section} type="button" onClick={() => goTo(link.section)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">{link.label}</button>
            ) : (
              <Link key={link.section} to={`/#${link.section}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-white/5">{link.label}</Link>
            )
          ))}
          {onNavigate ? (
            <button type="button" onClick={() => goTo('contacto')} className="block w-full rounded-lg bg-white px-3 py-2 text-left font-semibold text-slate-900">Contacto</button>
          ) : (
            <Link to="/#contacto" onClick={() => setOpen(false)} className="block rounded-lg bg-white px-3 py-2 font-semibold text-slate-900">Contacto</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
