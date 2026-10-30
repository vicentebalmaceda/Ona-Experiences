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

/**
 * Whether the hero video may autoplay on this device: not with reduced motion,
 * Data Saver or a slow connection. Reads browser APIs only when called from an
 * effect, so this module stays safe to render on the server.
 */
function videoAllowed() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = navigator.connection;
  if (connection?.saveData) return false;
  if (/(^|-)2g$|^3g$/.test(connection?.effectiveType || '')) return false;
  return true;
}

/**
 * Gate for the hero video: 'pending' until the page has loaded and the main
 * thread is idle, then 'play', or 'blocked' when `videoAllowed()` says no. A
 * multi-MB video thus never competes with the poster (the LCP image),
 * scripts or fonts.
 */
function useDeferredVideo(active) {
  const [state, setState] = useState('pending');

  useEffect(() => {
    if (!active || state !== 'pending') return undefined;
    if (!videoAllowed()) {
      setState('blocked');
      return undefined;
    }
    let idleId;
    let timeoutId;
    const start = () => {
      if (window.requestIdleCallback) {
        idleId = window.requestIdleCallback(() => setState('play'), { timeout: 2000 });
      } else {
        timeoutId = window.setTimeout(() => setState('play'), 200);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (idleId && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [active, state]);

  return state;
}

/**
 * Background media for the hero: an image, or a muted looping video over its
 * poster. There is no bundled fallback: a skeleton shimmers until the
 * published media is ready, and the plain dark hero stays if nothing is
 * published or it fails to load.
 */
function HeroMedia() {
  const { t } = useTranslation();
  const hero = useSiteAsset('hero');
  const poster = useSiteAsset('hero_poster');
  const [loaded, markLoaded] = useLoadedUrls();

  const isVideo = hero.kind === 'video' && hero.url;
  // The poster is drawn as a real <img> (high fetch priority) under the video
  // instead of the video's `poster` attribute, which browsers fetch lazily.
  const stillUrl = isVideo ? poster.url : hero.url;
  const stillReady = Boolean(stillUrl) && loaded.has(stillUrl);
  // The <video> is mounted only once the poster has painted (it is the LCP
  // image) and the page is loaded and idle. With a poster it stays out
  // entirely on reduced motion / Data Saver / slow networks; without one it
  // mounts paused so its first frame still shows.
  const videoGate = useDeferredVideo(Boolean(isVideo) && (stillReady || !poster.url));
  const mountVideo = isVideo && (videoGate === 'play' || (videoGate === 'blocked' && !poster.url));
  const videoReady = Boolean(isVideo) && loaded.has(hero.url);
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
          alt={isVideo ? '' : hero.alt || t('hero.image_alt')}
          aria-hidden={isVideo ? 'true' : undefined}
          fetchpriority="high"
          decoding="async"
          onLoad={() => markLoaded(stillUrl)}
          onError={isVideo ? poster.onError : hero.onError}
        />
      )}
      {mountVideo && (
        <video
          key={hero.url}
          className={`${layerClass} ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          src={hero.url}
          autoPlay={videoGate === 'play'}
          muted
          loop
          playsInline
          preload={videoGate === 'play' ? 'auto' : 'metadata'}
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
          <p className={`max-w-2xl font-display text-xl italic leading-snug text-ona-200 ${lettering} sm:text-2xl lg:text-3xl`}>{t('hero.tagline')}</p>
          <h1 className={`mt-4 max-w-3xl font-display text-4xl leading-[0.98] ${lettering} sm:text-6xl lg:text-7xl`}>{t('hero.heading')}</h1>
          <p className={`mt-6 max-w-2xl text-lg leading-8 text-slate-100 ${lettering} sm:text-xl`}>{t('hero.subtitle')}</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
