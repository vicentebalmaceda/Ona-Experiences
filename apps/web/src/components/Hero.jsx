import { useTranslation } from 'react-i18next';

const lettering =
  '[-webkit-text-stroke:1.15px_rgba(15,23,42,0.55)] [paint-order:stroke_fill] [text-shadow:0_0_2px_rgba(15,23,42,0.95),0_0_7px_rgba(15,23,42,0.75),0_0_14px_rgba(15,23,42,0.45),0_1px_2px_rgba(15,23,42,0.85),0_4px_16px_rgba(15,23,42,0.55),0_12px_32px_rgba(15,23,42,0.35)]';

function Hero() {
  const { t } = useTranslation();

  return (
    <section id="inicio" className="relative isolate min-h-[92vh] overflow-hidden bg-hero bg-cover bg-center pt-32 text-white">
      <div className="mx-auto flex min-h-[calc(92vh-8rem)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/90 backdrop-blur">{t('hero.eyebrow')}</div>
          <h1 className={`max-w-3xl font-display text-4xl leading-[0.98] ${lettering} sm:text-6xl lg:text-7xl`}>{t('hero.title')}</h1>
          <p className={`mt-6 max-w-2xl text-lg leading-8 text-slate-100 ${lettering} sm:text-xl`}>{t('hero.subtitle')}</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
