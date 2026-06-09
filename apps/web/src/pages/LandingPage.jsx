import { useEffect, useMemo, useState } from 'react';
import { lodges as seedLodges, guides as seedGuides } from '../data.js';
import { fetchLodges } from '../api/lodges.js';
import { fetchGuides } from '../api/guides.js';
import { mergeWithSeed } from '../utils/catalogMerge.js';
import { saveUserRating } from '../utils/rating.js';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import MapSection from '../components/MapSection.jsx';
import DirectorySection from '../components/DirectorySection.jsx';
import PricingSection from '../components/PricingSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import Footer from '../components/Footer.jsx';

const typeLabels = {
  lodge: 'Lodge',
  guide: 'Guía'
};

function LandingPage() {
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

  const zones = useMemo(() => ['all', ...new Set(allItems.map(item => item.zone).filter(Boolean))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a.localeCompare(b, 'es');
  }), [allItems]);

  const [filters, setFilters] = useState({ zone: 'all', type: 'all', text: '' });
  const [ratingVersion, setRatingVersion] = useState(0);

  const filteredItems = useMemo(() => {
    const textValue = filters.text.trim().toLowerCase();
    return allItems.filter(item => {
      const zoneMatch = filters.zone === 'all' || item.zone === filters.zone;
      const typeMatch = filters.type === 'all' || item.type === filters.type;
      const textMatch = !textValue || `${item.name} ${item.zone} ${item.email}`.toLowerCase().includes(textValue);
      return zoneMatch && typeMatch && textMatch;
    });
  }, [allItems, filters]);

  const filteredLodges = filteredItems.filter(item => item.type === 'Lodge');
  const filteredGuides = filteredItems.filter(item => item.type === 'Guía');

  const loadingNote = [
    lodgesLoading ? 'Cargando lodges…' : null,
    guidesLoading ? 'Cargando guías…' : null
  ].filter(Boolean).join(' ');

  const errorNote = [
    lodgesError ? 'Error al cargar lodges.' : null,
    guidesError ? 'Error al cargar guías.' : null
  ].filter(Boolean).join(' ');

  const summary = `${filteredItems.length} resultado(s) visibles${filters.zone !== 'all' ? ` en ${filters.zone}` : ''}: ${filteredLodges.length} lodge(s) y ${filteredGuides.length} guía(s).${loadingNote ? ` ${loadingNote}` : ''}${errorNote ? ` ${errorNote}` : ''}`;

  function applyFilters(event) {
    event.preventDefault();
  }

  function resetFilters() {
    setFilters({ zone: 'all', type: 'all', text: '' });
  }

  function handleRate(item, score) {
    saveUserRating(item, score);
    setRatingVersion(version => version + 1);
  }

  return (
    <div className="bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main>
        <Hero zones={zones} filters={filters} setFilters={setFilters} applyFilters={applyFilters} summary={summary} lodgesCount={lodgesCount} guidesCount={guidesCount} />
        <MapSection zones={zones} allItems={allItems} filteredItems={filteredItems} filters={filters} setFilters={setFilters} resetFilters={resetFilters} ratingVersion={ratingVersion} />
        <DirectorySection id="lodges-section" eyebrow="Lodges" title="Oferta de lodges" description="Listado de lodges desde BSale. Los campos vacíos se completan desde datos locales solo cuando coincide el productId." items={filteredLodges} emptyText={lodgesLoading ? 'Cargando lodges…' : lodgesError ? 'No se pudieron cargar los lodges.' : 'No hay lodges para este filtro.'} ratingVersion={ratingVersion} onRate={handleRate} />
        <DirectorySection id="guias-section" eyebrow="Guías" title="Red de guías" description="Listado de guías desde BSale. Los campos vacíos se completan desde datos locales solo cuando coincide el productId." items={filteredGuides} emptyText={guidesLoading ? 'Cargando guías…' : guidesError ? 'No se pudieron cargar las guías.' : 'No hay guías para este filtro.'} ratingVersion={ratingVersion} onRate={handleRate} />
        <PricingSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
