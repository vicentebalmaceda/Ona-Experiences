import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteAsset } from '../site/SiteAssetsProvider.jsx';

const lettering =
  '[-webkit-text-stroke:1.15px_rgba(15,23,42,0.55)] [paint-order:stroke_fill] [text-shadow:0_0_2px_rgba(15,23,42,0.95),0_0_7px_rgba(15,23,42,0.75),0_0_14px_rgba(15,23,42,0.45),0_1px_2px_rgba(15,23,42,0.85),0_4px_16px_rgba(15,23,42,0.55),0_12px_32px_rgba(15,23,42,0.35)]';

const layerClass = 'absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-500';

/** Tracks which media URLs have finished loading, so each layer fades in once ready. */
function useLoadedUrls() {
  const [loaded, setLoaded] = useState(() => new Set());
  const markLoaded = useCallback((url) => {
    setLoaded((current) => {
      if (!url || current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }, []);
  return [loaded, markLoaded];
}

// Phones get the hero_mobile video when one is published. Read on first
// render so a phone never starts downloading the desktop file.
const MOBILE_QUERY = '(max-width: 767px)';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Chrome's Data Saver / Lite mode, followed live where the browser reports changes. */
function useSaveData() {
  const connection = navigator.connection;
  const [saveData, setSaveData] = useState(() => Boolean(connection?.saveData));
  useEffect(() => {
    if (!connection?.addEventListener) return undefined;
    const onChange = () => setSaveData(Boolean(connection.saveData));
    connection.addEventListener('change', onChange);
    return () => connection.removeEventListener('change', onChange);
  }, [connection]);
  return saveData;
}

/**
 * Background media for the hero: an image, or a muted looping video over its
 * poster. There is no bundled fallback: a skeleton shimmers until the
 * published media is ready, and the plain dark hero stays if nothing is
 * published or it fails to load.
 */
function HeroMedia() {
  const desktopHero = useSiteAsset('hero');
  const mobileHero = useSiteAsset('hero_mobile');
  const poster = useSiteAsset('hero_poster');
  const isMobile = useMediaQuery(MOBILE_QUERY);
  // Data Saver and Reduce Motion users get the poster without the video.
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const saveData = useSaveData();
  const skipVideo = reduceMotion || saveData;
  const [loaded, markLoaded] = useLoadedUrls();

  // The mobile video only stands in for a video hero, never for an image one.
  const desktopIsVideo = desktopHero.kind === 'video' && Boolean(desktopHero.url);
  const hero = desktopIsVideo && isMobile && mobileHero.url ? mobileHero : desktopHero;
  // Skipping the video only makes sense when there is a poster to show instead.
  const playVideo = desktopIsVideo && !(skipVideo && poster.url);
  // The poster is drawn as a real <img> (high fetch priority) under the video
  // instead of the video's `poster` attribute, which browsers fetch lazily.
  const stillUrl = desktopIsVideo ? poster.url : hero.url;
  const stillReady = Boolean(stillUrl) && loaded.has(stillUrl);
  const videoReady = playVideo && loaded.has(hero.url);
  const loading = hero.status === 'loading' || (Boolean(hero.url) && !stillReady && !videoReady);

  // Catches images the browser already had cached, whose load event can fire
  // before React attaches the handler.
  const checkComplete = (url) => (element) => {
    if (element?.complete && element.naturalWidth > 0) markLoaded(url);
  };

  return (
    <>
      {loading && <div className="hero-skeleton absolute inset-0 -z-10" aria-hidden="true" />}
      {stillUrl && (
        <img
          key={stillUrl}
          ref={checkComplete(stillUrl)}
          className={`${layerClass} ${stillReady ? 'opacity-100' : 'opacity-0'}`}
          src={stillUrl}
          alt={desktopIsVideo ? '' : hero.alt || ''}
          aria-hidden={desktopIsVideo ? 'true' : undefined}
          fetchpriority="high"
          decoding="async"
          onLoad={() => markLoaded(stillUrl)}
          onError={desktopIsVideo ? poster.onError : hero.onError}
        />
      )}
      {playVideo && (
        <video
          key={hero.url}
          className={`${layerClass} ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          src={hero.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onLoadedData={() => markLoaded(hero.url)}
          onPlaying={() => markLoaded(hero.url)}
          onError={hero.onError}
        />
      )}
    </>
  );
}

function Hero() {
  const { t } = useTranslation();

  return (
    <section id="inicio" className="relative isolate min-h-[92vh] overflow-hidden bg-slate-900 pt-32 text-white">
      <HeroMedia />
      <div className="mx-auto flex min-h-[calc(92vh-8rem)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <h1 className={`max-w-3xl font-display text-4xl leading-[0.98] ${lettering} sm:text-6xl lg:text-7xl`}>{t('hero.title')}</h1>
          <p className={`mt-6 max-w-2xl text-lg leading-8 text-slate-100 ${lettering} sm:text-xl`}>{t('hero.subtitle')}</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
