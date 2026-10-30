import { useEffect, useState } from 'react';
import useInViewOnce from './useInViewOnce.js';
import { loadLeaflet } from '../utils/leafletLoader.js';

/**
 * Returns [containerRef, L]. `L` stays null until the container first comes
 * near the viewport, then resolves to the Leaflet namespace (loaded lazily).
 * Attach `containerRef` to the map's sized element so it doubles as a
 * same-size placeholder while Leaflet downloads (no layout shift).
 */
export default function useLazyLeaflet({ rootMargin = '300px 0px' } = {}) {
  const [ref, inView] = useInViewOnce({ rootMargin, threshold: 0 });
  const [leaflet, setLeaflet] = useState(null);

  useEffect(() => {
    if (!inView || leaflet) return undefined;
    let alive = true;
    loadLeaflet()
      .then((L) => {
        if (alive) setLeaflet(() => L);
      })
      .catch((error) => console.error('Failed to load the map library:', error));
    return () => {
      alive = false;
    };
  }, [inView, leaflet]);

  return [ref, leaflet];
}
