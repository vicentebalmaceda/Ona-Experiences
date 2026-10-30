import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';
import { DEFAULT_LANG, normalizeLang, SUPPORTED_LANGS } from '../routes.js';

/**
 * localStorage key that remembers the visitor dismissed the language
 * suggestion banner ('dismissed') or picked a language in the switcher
 * ('es' / 'en'). It never selects the content language: that comes only from
 * the URL. Read and written only in effects and event handlers.
 */
export const LANGUAGE_STORAGE_KEY = 'ona-lang';

export const resources = {
  es: { translation: es },
  en: { translation: en }
};

/**
 * A fresh, synchronously initialized i18next instance in `lang` (the URL
 * language). The browser calls it once in main.jsx with the language of
 * `window.location.pathname`; a server render calls it per request with
 * `langFromPath(url)` and passes the instance to <I18nextProvider>, so the
 * first render is already in the URL's language. No browser APIs are touched.
 */
export function createI18n(lang = DEFAULT_LANG) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng: normalizeLang(lang),
    fallbackLng: DEFAULT_LANG,
    supportedLngs: SUPPORTED_LANGS,
    load: 'languageOnly',
    initAsync: false,
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });
  return instance;
}
