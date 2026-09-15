import { useTranslation } from 'react-i18next';

const ONA_FLYFISHING_URL = 'https://www.onaflyfishing.cl';

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>{t('footer.copyright')}</p>
        <p>
          {t('footer.division')}{' '}
          <a
            href={ONA_FLYFISHING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 underline-offset-2 transition hover:text-slate-900 hover:underline"
          >
            ONA Fly Fishing
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
