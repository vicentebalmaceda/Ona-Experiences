import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import en from './locales/en.json';

const LANGUAGE_STORAGE_KEY = 'ona-lang';

function syncDocumentLang(lng) {
  const language = (lng || 'es').split('-')[0];
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en }
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage']
    }
  });

syncDocumentLang(i18n.language);
i18n.on('languageChanged', syncDocumentLang);

export { LANGUAGE_STORAGE_KEY };
export default i18n;
