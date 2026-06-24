import { useEffect, useMemo, useState } from 'react';
import { lodges, guides } from './data.js';
import { saveUserRating } from './utils/rating.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import ExperienceSection from './components/ExperienceSection.jsx';
import DetailPage from './components/DetailPage.jsx';
import PricingSection from './components/PricingSection.jsx';
import ContactSection from './components/ContactSection.jsx';
import Footer from './components/Footer.jsx';

const typeLabels = {
  lodge: 'Lodge',
  guide: 'Guía'
};

function App() {
  const lodgeItems = useMemo(() => lodges.map(item => ({ ...item, type: typeLabels.lodge })), []);
  const guideItems = useMemo(() => guides.map(item => ({ ...item, type: typeLabels.guide })), []);
  const allItems = useMemo(() => [...lodgeItems, ...guideItems], [lodgeItems, guideItems]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [ratingVersion, setRatingVersion] = useState(0);

  function handleRate(item, score) {
    saveUserRating(item, score);
    setRatingVersion(version => version + 1);
  }

  function navigateTo(sectionId) {
    setSelectedItem(null);
    window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function openDetail(item) {
    setSelectedItem(item);
  }

  useEffect(() => {
    if (selectedItem) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedItem]);

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header onNavigate={navigateTo} />

      {selectedItem ? (
        <main>
          <DetailPage
            item={selectedItem}
            ratingVersion={ratingVersion}
            onRate={handleRate}
            onBack={() => setSelectedItem(null)}
            onNavigate={navigateTo}
          />
        </main>
      ) : (
        <main>
          <Hero
            zonesCount={new Set(allItems.map(item => item.zone)).size}
            lodgesCount={lodges.length}
            guidesCount={guides.length}
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
            onRate={handleRate}
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
            onRate={handleRate}
          />

          <PricingSection />
          <ContactSection />
        </main>
      )}

      <Footer />
    </div>
  );
}

export default App;
