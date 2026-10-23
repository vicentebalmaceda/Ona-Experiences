import { Trans, useTranslation } from 'react-i18next';
import BrandMark from './BrandMark.jsx';

/** Founders' photo. Real pixel size is passed to <img> to avoid layout shift. */
const FOUNDERS_PHOTO = {
  src: '/assets/about/marcos-vicente-balmaceda.webp',
  width: 1040,
  height: 1387
};

/**
 * One paragraph of the copy (about.p1 … about.p5).
 * Translations mark the brand with <brand> and highlights with <b>; Trans maps
 * them to real React elements, so no HTML string is injected into the page.
 * Renders inline content only: the caller decides the wrapping <p> and styles.
 */
function AboutText({ id, strongClassName = 'font-semibold text-slate-900' }) {
  return (
    <Trans
      i18nKey={`about.${id}`}
      components={{
        brand: <BrandMark />,
        b: <strong className={strongClassName} />
      }}
    />
  );
}

/**
 * "Quiénes somos" in a magazine-feature layout: serif masthead with a hairline
 * byline, portrait photo with caption on the left, and the story on the right,
 * opening with a larger lead paragraph and closing with a statement.
 */
function AboutSection() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="about-title" className="bg-sand pb-24 pt-40 sm:pb-32 sm:pt-44">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-ona-700">{t('about.eyebrow')}</p>
          <h1
            id="about-title"
            className="mt-4 font-editorial text-5xl font-normal leading-[1.02] tracking-[-0.02em] text-forest sm:text-6xl lg:text-[5.25rem]"
          >
            {t('about.title')}
          </h1>
          <div className="mt-8 flex flex-col gap-1 border-t border-forest/20 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-forest">{t('about.founders')}</span>
            <span>{t('about.kicker')}</span>
          </div>
        </header>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-x-16">
          {/* Photo stays in view on desktop while the longer text column scrolls. */}
          <figure className="lg:sticky lg:top-36 lg:col-span-5 lg:self-start">
            <img
              src={FOUNDERS_PHOTO.src}
              width={FOUNDERS_PHOTO.width}
              height={FOUNDERS_PHOTO.height}
              alt={t('about.photo_alt')}
              decoding="async"
              className="aspect-[3/4] w-full rounded-[3px] bg-forest-100 object-cover"
            />
            <figcaption className="mt-4 border-l-2 border-gold pl-3 font-editorial text-[15px] italic leading-6 text-slate-600">
              {t('about.photo_caption')}
            </figcaption>
          </figure>

          <div className="lg:col-span-7 xl:col-span-6 xl:col-start-7">
            <p className="font-editorial text-2xl leading-[1.45] text-slate-900 sm:text-[1.75rem]">
              <AboutText id="p1" strongClassName="font-semibold" />
            </p>

            <div className="mt-8 space-y-6 text-[17px] leading-8 text-slate-700 sm:text-lg sm:leading-[1.85]">
              <p><AboutText id="p2" /></p>
              <p><AboutText id="p3" /></p>
              <p><AboutText id="p4" /></p>
            </div>

            <p className="mt-12 border-t border-forest/20 pt-8 font-editorial text-[1.625rem] italic leading-[1.35] text-forest sm:text-3xl sm:leading-[1.3]">
              <AboutText id="p5" strongClassName="font-semibold not-italic" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
