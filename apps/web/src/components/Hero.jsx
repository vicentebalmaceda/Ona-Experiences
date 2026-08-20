import { useTranslation } from 'react-i18next';

function Hero() {
  const { t } = useTranslation();

  return (
    <section id="inicio" className="relative isolate min-h-[92vh] overflow-hidden bg-hero bg-cover bg-center pt-32 text-white">
      <div className="mx-auto flex min-h-[calc(92vh-8rem)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/90 backdrop-blur">{t('hero.eyebrow')}</div>
          <h1 className="max-w-3xl font-display text-4xl leading-[0.98] sm:text-6xl lg:text-7xl">{t('hero.title')}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">{t('hero.subtitle')}</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
