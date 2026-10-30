import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLocalizedPath } from '../i18n/locale.js';

/** Body of the not-found page, also shown by a detail page whose product doesn't exist. */
export function NotFoundContent() {
  const { t } = useTranslation();
  const { pathTo, homeSection } = useLocalizedPath();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-44 text-center sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">404</p>
      <h1 className="mt-3 font-display text-4xl text-slate-950">{t('not_found.title')}</h1>
      <p className="mt-4 text-base leading-7 text-slate-600">{t('not_found.text')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to={pathTo('home')}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t('not_found.back_home')}
        </Link>
        <Link
          to={homeSection('lodges-section')}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t('not_found.see_lodges')}
        </Link>
      </div>
    </div>
  );
}

/** Unknown routes. Head metadata (noindex) comes from buildHead's notFound page. */
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main>
        <NotFoundContent />
      </main>
      <Footer />
    </div>
  );
}

export default NotFoundPage;
