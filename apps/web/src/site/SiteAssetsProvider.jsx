import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SLOT_RULES } from '../../shared/siteAssetSlots.ts';
import { useInitialData } from './initialData.js';
import { defaultSiteAssets, mergePublished, sameData } from './pageData.js';

export { defaultSiteAssets, mergePublished };

/**
 * Admin-managed site assets (hero, hero poster, logo).
 *
 * On a prerendered page the assets published at build time come embedded
 * (window.__ONA_DATA__.siteAssets), so the first render already shows them
 * (and matches the server HTML). Otherwise slots with a bundled default (the
 * logo) render it immediately, and slots without one (the hero) have
 * `url: null` with `status: 'loading'` until `/api/v1/site/assets` answers.
 * Either way the API is asked again after mount; an unchanged answer keeps
 * the same state, so nothing re-renders. A load error on a published file
 * (deleted blob, blocked store) falls back to the default for that slot via
 * `onError`, which for the hero means no media.
 */

// Former localStorage memo of the API answer. It made repeat visits show a
// stale hero, so it is no longer used; the key is cleared on load.
const LEGACY_STORAGE_KEY = 'ona-site-assets';
const ASSETS_PATH = '/api/v1/site/assets';

function apiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\/$/, '');
}

function defaultAsset(rules) {
  return { kind: rules.defaultKind, url: rules.defaultUrl, alt: null, width: null, height: null, isDefault: true };
}

function clearLegacyMemo() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Private mode: nothing to clear.
  }
}

const SiteAssetsContext = createContext(null);

export function SiteAssetsProvider({ children }) {
  const { data } = useInitialData();
  const embedded = data?.siteAssets?.items;
  const [assets, setAssets] = useState(() => (embedded ? mergePublished(embedded) : defaultSiteAssets()));
  // 'loading' until the API answers, then 'ready'; 'error' if it never does.
  // Embedded assets are already an answer.
  const [status, setStatus] = useState(embedded ? 'ready' : 'loading');
  // Slots whose published file failed to load in this session.
  const [failed, setFailed] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    clearLegacyMemo();
    fetch(`${apiBase()}${ASSETS_PATH}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          // Keep embedded assets; without them, slots settle on their empty state.
          setStatus((current) => (current === 'ready' ? current : 'error'));
          return;
        }
        const next = mergePublished(payload.items);
        setAssets((current) => (sameData(current, next) ? current : next));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus((current) => (current === 'ready' ? current : 'error'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markFailed = useCallback((slot) => {
    setFailed((current) => {
      if (current.has(slot)) return current;
      const next = new Set(current);
      next.add(slot);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ assets, status, failed, markFailed }), [assets, status, failed, markFailed]);

  return <SiteAssetsContext.Provider value={value}>{children}</SiteAssetsContext.Provider>;
}

/**
 * Returns `{ kind, url, alt, width, height, isDefault, status, onError }` for a
 * slot. `url` is null for a slot with no default until something published
 * arrives. Attach `onError` to the <img>/<video> so a broken published file
 * degrades to the bundled default (or to no media).
 */
export function useSiteAsset(slot) {
  const context = useContext(SiteAssetsContext);
  const rules = SLOT_RULES[slot];
  if (!rules) {
    throw new Error(`Unknown site asset slot: ${slot}`);
  }

  const fallback = defaultAsset(rules);

  const asset = context?.assets?.[slot] ?? fallback;
  const useFallback = asset.isDefault || context?.failed?.has(slot);
  const resolved = useFallback ? fallback : asset;
  const markFailed = context?.markFailed;

  return {
    ...resolved,
    status: context?.status ?? 'ready',
    onError: () => {
      if (!resolved.isDefault && markFailed) markFailed(slot);
    }
  };
}
