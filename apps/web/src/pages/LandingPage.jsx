import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLodges } from '../api/lodges.js';
import { fetchGuides } from '../api/guides.js';
import { useInitialData } from '../site/initialData.js';
import { landingItems, sameData } from '../site/pageData.js';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import ExperienceSection from '../components/ExperienceSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import Footer from '../components/Footer.jsx';
import { useLocalizedPath } from '../i18n/locale.js';

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { detailPath } = useLocalizedPath();

  const { data, ssr } = useInitialData();
  // Prerendered landing: the lists come embedded, so the first render is the
  // final page (and matches the HTML); they are revalidated after mount.
  const embedded = data?.catalog ?? null;
  const [apiLodges, setApiLodges] = useState(() => embedded?.lodges ?? []);
  const [lodgesLoading, setLodgesLoading] = useState(!embedded && !ssr);
  const [lodgesError, setLodgesError] = useState(null);

  const [apiGuides, setApiGuides] = useState(() => embedded?.guides ?? []);
  const [guidesLoading, setGuidesLoading] = useState(!embedded && !ssr);
  const [guidesError, setGuidesError] = useState(null);
  const hasLodges = useRef(Boolean(embedded));
  const hasGuides = useRef(Boolean(embedded));

  useEffect(() => {
    let cancelled = false;
    const revalidating = hasLodges.current;

    async function loadLodges() {
      if (!revalidating) setLodgesLoading(true);
      setLodgesError(null);

      try {
        const result = await fetchLodges({ limit: 50, offset: 0 });
        if (cancelled) return;
        const next = result.items ?? [];
        hasLodges.current = true;
        setApiLodges((current) => (sameData(current, next) ? current : next));
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load lodges from API:', error);
        // A failed revalidation keeps what is on screen.
        if (!revalidating) {
          setLodgesError(error instanceof Error ? error.message : t('lodges.error'));
          setApiLodges([]);
        }
      } finally {
        if (!cancelled) setLodgesLoading(false);
      }
    }

    loadLodges();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    const revalidating = hasGuides.current;

    async function loadGuides() {
      if (!revalidating) setGuidesLoading(true);
      setGuidesError(null);

      try {
        const result = await fetchGuides({ limit: 50, offset: 0 });
        if (cancelled) return;
        const next = result.items ?? [];
        hasGuides.current = true;
        setApiGuides((current) => (sameData(current, next) ? current : next));
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load guides from API:', error);
        if (!revalidating) {
          setGuidesError(error instanceof Error ? error.message : t('guides.error'));
          setApiGuides([]);
        }
      } finally {
        if (!cancelled) setGuidesLoading(false);
      }
    }

    loadGuides();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Seed presentation filled in; internal type codes for routing / ratings
  // (display labels come from i18n).
  const { lodgeItems, guideItems } = useMemo(
    () => landingItems(apiLodges, apiGuides),
    [apiLodges, apiGuides]
  );

  const [ratingVersion] = useState(0);

  function navigateTo(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openDetail(item) {
    const path = detailPath(item);
    if (path) navigate(path);
  }

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header onNavigate={navigateTo} />
      <main>
        <Hero />

        <ExperienceSection
          id="lodges-section"
          mapAnchorId="mapa-section"
          eyebrow={t('lodges.eyebrow')}
          title={t('lodges.title')}
          description={t('lodges.description')}
          heroImage="/assets/lodges/manihuales-eco-lodge-5.jpg"
          heroAlt={t('lodges.hero_alt')}
          items={lodgeItems}
          ratingVersion={ratingVersion}
          onSelect={openDetail}
          emptyText={lodgesLoading ? t('lodges.loading') : lodgesError ? t('lodges.error') : undefined}
        />

        <ExperienceSection
          id="guias-section"
          eyebrow={t('guides.eyebrow')}
          title={t('guides.title')}
          description={t('guides.description')}
          heroImage="/assets/lodges/bio-bio-lodge-2.jpg"
          heroAlt={t('guides.hero_alt')}
          items={guideItems}
          ratingVersion={ratingVersion}
          onSelect={openDetail}
          emptyText={guidesLoading ? t('guides.loading') : guidesError ? t('guides.error') : undefined}
        />

        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
