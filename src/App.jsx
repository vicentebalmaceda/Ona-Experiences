import { useMemo, useState } from 'react';
import { lodges, guides } from './data.js';
import { saveUserRating } from './utils/rating.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import MapSection from './components/MapSection.jsx';
import DirectorySection from './components/DirectorySection.jsx';
import PricingSection from './components/PricingSection.jsx';
import ContactSection from './components/ContactSection.jsx';
import Footer from './components/Footer.jsx';

const typeLabels = {
  lodge: 'Lodge',
  guide: 'Guía'
};

function App() {
  const allItems = useMemo(() => [
    ...lodges.map(item => ({ ...item, type: typeLabels.lodge })),
    ...guides.map(item => ({ ...item, type: typeLabels.guide }))
  ], []);

  const zones = useMemo(() => ['all', ...new Set(allItems.map(item => item.zone))].sort((a, b) => {
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

  const summary = `${filteredItems.length} resultado(s) visibles${filters.zone !== 'all' ? ` en ${filters.zone}` : ''}: ${filteredLodges.length} lodge(s) y ${filteredGuides.length} guía(s).`;

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
        <Hero zones={zones} filters={filters} setFilters={setFilters} applyFilters={applyFilters} summary={summary} />
        <MapSection zones={zones} allItems={allItems} filteredItems={filteredItems} filters={filters} setFilters={setFilters} resetFilters={resetFilters} ratingVersion={ratingVersion} />
        <DirectorySection id="lodges-section" eyebrow="Lodges" title="Oferta de lodges" description="Listado inicial de lodges cargados para ONA Experiences, organizado por localidad y con formato listo para seguir creciendo." items={filteredLodges} emptyText="No hay lodges para este filtro." ratingVersion={ratingVersion} onRate={handleRate} />
        <DirectorySection id="guias-section" eyebrow="Guías" title="Red de guías" description="Perfiles iniciales de guías asociados a las zonas actualmente cubiertas." items={filteredGuides} emptyText="No hay guías para este filtro." ratingVersion={ratingVersion} onRate={handleRate} />
        <PricingSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
