import { useEffect } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import AboutSection from '../components/about/AboutSection.jsx';

/** "Quiénes somos" page (/quienes-somos). */
function AboutPage() {
  // Client-side navigation keeps the previous scroll position; start at the top.
  // 'instant' overrides the global `scroll-behavior: smooth` so the page
  // doesn't visibly scroll up when it opens.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main>
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
}

export default AboutPage;
