import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ONA_FLYFISHING_URL = 'https://www.onaflyfishing.cl';

function Header({ onNavigate }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const language = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0];

  const links = [
    { label: t('nav.ona_flyfishing'), href: ONA_FLYFISHING_URL },
    { label: t('nav.lodges'), section: 'lodges-section' },
    { label: t('nav.guides'), section: 'guias-section' }
  ];

  function goTo(section) {
    setOpen(false);
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    window.location.href = `/#${section}`;
  }

  function changeLanguage(lng) {
    i18n.changeLanguage(lng);
  }

  const LogoWrapper = onNavigate ? 'button' : Link;
  const logoProps = onNavigate
    ? { type: 'button', onClick: () => goTo('inicio'), className: 'flex items-center gap-3 text-left' }
    : { to: '/#inicio', className: 'flex items-center gap-3' };

  function renderNavLink(link, { mobile = false } = {}) {
    const key = link.href || link.section;
    if (link.href) {
      return (
        <a
          key={key}
          href={link.href}
          className={mobile ? 'block rounded-lg px-3 py-2 hover:bg-white/5' : 'transition hover:text-white'}
          onClick={() => setOpen(false)}
        >
          {link.label}
        </a>
      );
    }
    if (onNavigate) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => goTo(link.section)}
          className={mobile ? 'block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5' : 'transition hover:text-white'}
        >
          {link.label}
        </button>
      );
    }
    return (
      <Link
        key={key}
        to={`/#${link.section}`}
        onClick={mobile ? () => setOpen(false) : undefined}
        className={mobile ? 'block rounded-lg px-3 py-2 hover:bg-white/5' : 'hover:text-white'}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="border-b border-white/10 bg-slate-950/40">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-1.5 sm:px-6 lg:px-8">
          <span className="sr-only">{t('nav.language')}</span>
          <div
            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
            role="group"
            aria-label={t('nav.language')}
          >
            <button
              type="button"
              onClick={() => changeLanguage('es')}
              className={`rounded-full px-2.5 py-1 transition ${language === 'es' ? 'bg-white text-slate-900' : 'hover:text-white'}`}
              aria-pressed={language === 'es'}
            >
              {t('nav.lang_es')}
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`rounded-full px-2.5 py-1 transition ${language === 'en' ? 'bg-white text-slate-900' : 'hover:text-white'}`}
              aria-pressed={language === 'en'}
            >
              {t('nav.lang_en')}
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <LogoWrapper {...logoProps}>
          <img src="/assets/logo-ona.png" alt="ONA Experiences" className="h-12 w-12 rounded-full bg-white/90 object-contain p-1.5 shadow-soft" />
          <div>
            <p className="font-display text-lg text-white">{t('nav.brand')}</p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">{t('nav.tagline')}</p>
          </div>
        </LogoWrapper>
        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          {links.map(link => renderNavLink(link))}
          {onNavigate ? (
            <button type="button" onClick={() => goTo('contacto')} className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200">{t('nav.contact')}</button>
          ) : (
            <Link to="/#contacto" className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200">{t('nav.contact')}</Link>
          )}
        </nav>
        <button onClick={() => setOpen(!open)} className="rounded-xl border border-white/15 p-2 text-white md:hidden" aria-label={t('nav.open_menu')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <div className={`${open ? 'block' : 'hidden'} border-t border-white/10 bg-slate-950/95 md:hidden`}>
        <div className="space-y-1 px-4 py-4 text-sm text-slate-200">
          {links.map(link => renderNavLink(link, { mobile: true }))}
          {onNavigate ? (
            <button type="button" onClick={() => goTo('contacto')} className="block w-full rounded-lg bg-white px-3 py-2 text-left font-semibold text-slate-900">{t('nav.contact')}</button>
          ) : (
            <Link to="/#contacto" onClick={() => setOpen(false)} className="block rounded-lg bg-white px-3 py-2 font-semibold text-slate-900">{t('nav.contact')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
