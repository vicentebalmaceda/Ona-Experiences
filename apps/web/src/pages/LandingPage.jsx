import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { fetchLodges } from '../api/lodges.js';
import { fetchGuides } from '../api/guides.js';
import { mergeWithSeed } from '../utils/catalogMerge.js';
import { saveUserRating } from '../utils/rating.js';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import ExperienceSection from '../components/ExperienceSection.jsx';
import PricingSection from '../components/PricingSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import Footer from '../components/Footer.jsx';

const typeLabels = {
  lodge: 'Lodge',
  guide: 'Guía'
};

function LandingPage() {
  const navigate = useNavigate();

  const [apiLodges, setApiLodges] = useState([]);
  const [lodgesCount, setLodgesCount] = useState(0);
  const [lodgesLoading, setLodgesLoading] = useState(true);
  const [lodgesError, setLodgesError] = useState(null);

  const [apiGuides, setApiGuides] = useState([]);
  const [guidesCount, setGuidesCount] = useState(0);
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
        setLodgesCount(data.pagination?.count ?? data.items?.length ?? 0);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load lodges from API:', error);
        setLodgesError(error instanceof Error ? error.message : 'Failed to load lodges');
        setApiLodges([]);
        setLodgesCount(0);
      } finally {
        if (!cancelled) setLodgesLoading(false);
      }
    }

    loadLodges();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGuides() {
      setGuidesLoading(true);
      setGuidesError(null);

      try {
        const data = await fetchGuides({ limit: 50, offset: 0 });
        if (cancelled) return;
        setApiGuides(data.items ?? []);
        setGuidesCount(data.pagination?.count ?? data.items?.length ?? 0);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load guides from API:', error);
        setGuidesError(error instanceof Error ? error.message : 'Failed to load guides');
        setApiGuides([]);
        setGuidesCount(0);
      } finally {
        if (!cancelled) setGuidesLoading(false);
      }
    }

    loadGuides();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayLodges = useMemo(
    () => mergeWithSeed(apiLodges, seedLodges),
    [apiLodges]
  );

  const displayGuides = useMemo(
    () => mergeWithSeed(apiGuides, seedGuides),
    [apiGuides]
  );

  const lodgeItems = useMemo(
    () => displayLodges.map((item) => ({ ...item, type: typeLabels.lodge })),
    [displayLodges]
  );

  const guideItems = useMemo(
    () => displayGuides.map((item) => ({ ...item, type: typeLabels.guide })),
    [displayGuides]
  );

  const allItems = useMemo(
    () => [...lodgeItems, ...guideItems],
    [lodgeItems, guideItems]
  );

  const zonesCount = useMemo(
    () => new Set(allItems.map(item => item.zone).filter(Boolean)).size,
    [allItems]
  );

  const [ratingVersion, setRatingVersion] = useState(0);

  function navigateTo(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openDetail(item) {
    if (!item.productId) return;
    const path = item.type === 'Lodge' ? `/lodges/${item.productId}` : `/guides/${item.productId}`;
    navigate(path);
  }

  function handleRate(item, score) {
    saveUserRating(item, score);
    setRatingVersion(version => version + 1);
  }

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header onNavigate={navigateTo} />
      <main>
        <Hero
          zonesCount={zonesCount}
          lodgesCount={lodgesCount}
          guidesCount={guidesCount}
          onNavigate={navigateTo}
        />

        <ExperienceSection
          id="lodges-section"
          mapAnchorId="mapa-section"
          eyebrow="Lodges"
          title="Lodges de pesca con mosca"
          description="Una vista simple para comparar lodges, ver su ubicación en el mapa y entrar al detalle con reseñas, calificaciones y opción de agenda."
          heroImage="/assets/lodges/manihuales-eco-lodge-5.jpg"
          heroAlt="Lodge de pesca con mosca en Patagonia"
          items={lodgeItems}
          ratingVersion={ratingVersion}
          onSelect={openDetail}
          emptyText={lodgesLoading ? 'Cargando lodges…' : lodgesError ? 'No se pudieron cargar los lodges.' : undefined}
        />

        <ExperienceSection
          id="guias-section"
          eyebrow="Guías"
          title="Guías especializados"
          description="Perfiles de guías con navegación rápida, mapa integrado y acceso directo para revisar y solicitar disponibilidad."
          heroImage="/assets/lodges/bio-bio-lodge-2.jpg"
          heroAlt="Guía ayudando en una jornada de pesca con mosca"
          items={guideItems}
          ratingVersion={ratingVersion}
          onSelect={openDetail}
          emptyText={guidesLoading ? 'Cargando guías…' : guidesError ? 'No se pudieron cargar las guías.' : undefined}
        />

        <PricingSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
