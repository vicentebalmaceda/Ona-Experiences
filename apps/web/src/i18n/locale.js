import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_LANG, detailPathFor, homeSectionPath, localizePath } from '../routes.js';

/** The URL language of the current route, provided by <LocaleLayout>. */
export const LocaleContext = createContext(DEFAULT_LANG);

export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * Link builders bound to the current URL language, so internal links never
 * leave it:
 *   const { lang, pathTo, homeSection, detailPath } = useLocalizedPath();
 *   pathTo('about')            → '/quienes-somos' | '/en/about'
 *   homeSection('contacto')    → '/#contacto'     | '/en#contacto'
 *   detailPath(item)           → '/lodges/<slug>' | '/en/lodges/<slug>'
 * `pathTo` falls back to the home page when the page doesn't exist in the language.
 */
export function useLocalizedPath() {
  const lang = useLocale();
  const pathTo = useCallback(
    (pageId, params) => localizePath(pageId, lang, params) ?? localizePath('home', lang),
    [lang]
  );
  const homeSection = useCallback(sectionId => homeSectionPath(lang, sectionId), [lang]);
  const detailPath = useCallback(item => detailPathFor(item, lang), [lang]);
  return { lang, pathTo, homeSection, detailPath };
}
