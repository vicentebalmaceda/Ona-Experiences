import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY } from '../i18n/index.js';
import { alternatesFor } from '../routes.js';

function readStoredChoice() {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLanguageChoice(value) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  } catch {
    // Private mode or blocked storage: the banner may show again, that's all.
  }
}

/**
 * Small, dismissible offer to read a Spanish page in English, for visitors
 * whose browser prefers English. It never redirects (crawlers must see stable
 * URLs) and decides only after mount, so server and first client render match.
 *
 * Hidden once the visitor dismissed it or chose Spanish in the switcher. A
 * stored 'en' (an English choice, or a value cached by the old language
 * detector) still shows it, since that visitor prefers English.
 */
function LanguageSuggestion() {
  const { t } = useTranslation();
  const { pathname, hash } = useLocation();
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const target = alternatesFor(pathname).en;

  useEffect(() => {
    const prefersEnglish = /^en\b/i.test(window.navigator?.language || '');
    const stored = readStoredChoice();
    setEligible(prefersEnglish && stored !== 'es' && stored !== 'dismissed');
  }, []);

  if (!eligible || dismissed || !target) return null;

  // Shown to English speakers on Spanish pages, so it is always written in English.
  const tEn = (key) => t(key, { lng: 'en' });

  function dismiss() {
    storeLanguageChoice('dismissed');
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label={tEn('language_banner.label')}
      lang="en"
      className="fixed bottom-4 left-4 right-4 z-[1001] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-card backdrop-blur sm:right-auto"
    >
      <Link
        to={{ pathname: target, hash }}
        hrefLang="en"
        onClick={() => storeLanguageChoice('en')}
        className="flex-1 font-semibold text-ona-700 underline-offset-2 hover:underline"
      >
        {tEn('language_banner.cta')}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-full px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label={tEn('language_banner.dismiss')}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export default LanguageSuggestion;
