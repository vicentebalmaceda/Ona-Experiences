import { useEffect, useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LocaleContext } from '../i18n/locale.js';
import LanguageSuggestion from './LanguageSuggestion.jsx';

// useLayoutEffect warns during server rendering; there the language already matches.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Route wrapper for one URL language. Keeps `i18n.language` equal to the URL
 * language on client navigation (e.g. '/' → '/en') and provides it to links
 * through LocaleContext.
 *
 * When the i18n language doesn't match yet, it renders nothing and switches
 * in a layout effect, which runs before the browser paints: the page never
 * shows (or starts effects in) the wrong language. On the first render the
 * language already matches, because i18n was created with the URL language.
 */
function LocaleLayout({ lang }) {
  const { i18n } = useTranslation();
  const ready = i18n.language === lang;

  useIsomorphicLayoutEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [i18n, lang]);

  if (!ready) return null;

  return (
    <LocaleContext.Provider value={lang}>
      <Outlet />
      {lang === 'es' ? <LanguageSuggestion /> : null}
    </LocaleContext.Provider>
  );
}

export default LocaleLayout;
