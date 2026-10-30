/**
 * Loads Leaflet (JS + CSS) on demand, once. Keeps the map library and its CSS
 * out of the initial bundle; callers import it only when a map is about to be
 * visible. Touches no browser globals at module load, so it is SSR-safe.
 */
let leafletPromise = null;

export function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      .then(([mod]) => mod.default ?? mod)
      .catch((error) => {
        // Allow a retry on the next mount (e.g. after a flaky network).
        leafletPromise = null;
        throw error;
      });
  }
  return leafletPromise;
}
