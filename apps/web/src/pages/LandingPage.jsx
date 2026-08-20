import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { fetchLodges } from '../api/lodges.js';
import { fetchGuides } from '../api/guides.js';
import { mergeWithSeed } from '../utils/catalogMerge.js';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import ExperienceSection from '../components/ExperienceSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import Footer from '../components/Footer.jsx';

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [apiLodges, setApiLodges] = useState([]);
  const [lodgesLoading, setLodgesLoading] = useState(true);
  const [lodgesError, setLodgesError] = useState(null);

  const [apiGuides, setApiGuides] = useState([]);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [guidesError, setGuidesError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLodges() {
      setLodgesLoading(true);
      setLodgesError(null);

      try {
        const data = await fetchLodges({ limit: 50, offset: 0 });
        if (cancelled) return;
        setApiLodges(data.items ?? []);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load lodges from API:', error);
        setLodgesError(error instanceof Error ? error.message : t('lodges.error'));
        setApiLodges([]);
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

    async function loadGuides() {
      setGuidesLoading(true);
      setGuidesError(null);

      try {
        const data = await fetchGuides({ limit: 50, offset: 0 });
        if (cancelled) return;
        setApiGuides(data.items ?? []);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load guides from API:', error);
        setGuidesError(error instanceof Error ? error.message : t('guides.error'));
        setApiGuides([]);
      } finally {
        if (!cancelled) setGuidesLoading(false);
      }
    }

    loadGuides();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const displayLodges = useMemo(
    () => mergeWithSeed(apiLodges, seedLodges),
    [apiLodges]
  );

  const displayGuides = useMemo(
    () => mergeWithSeed(apiGuides, seedGuides),
    [apiGuides]
  );

  // Keep internal type codes for routing / ratings; display labels come from i18n.
  const lodgeItems = useMemo(
    () => displayLodges.map((item) => ({ ...item, type: 'Lodge' })),
    [displayLodges]
  );

  const guideItems = useMemo(
    () => displayGuides.map((item) => ({ ...item, type: 'Guía' })),
    [displayGuides]
  );

  const [ratingVersion] = useState(0);

  function navigateTo(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openDetail(item) {
    if (!item.productId) return;
    const path = item.type === 'Lodge' ? `/lodges/${item.productId}` : `/guides/${item.productId}`;
    navigate(path);
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
