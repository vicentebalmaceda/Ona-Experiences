import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SLOT_RULES } from '../../shared/siteAssetSlots.ts';

/**
 * Admin-managed site assets (hero, hero poster, logo).
 *
 * Slots with a bundled default (the logo) render it immediately and swap to
 * whatever an Admin published once `/api/v1/site/assets` answers. Slots
 * without one (the hero) have `url: null` until then, and `status` tells the
 * component whether to show a loading skeleton (`loading`) or settle on an
 * empty state (`ready` with nothing published, or `error`). A load error on a
 * published file (deleted blob, blocked store) falls back to the default for
 * that slot via `onError`, which for the hero means no media.
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

export function defaultSiteAssets() {
  return Object.fromEntries(Object.entries(SLOT_RULES).map(([slot, rules]) => [slot, defaultAsset(rules)]));
}

function clearLegacyMemo() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Private mode: nothing to clear.
  }
}

/** Merge the API answer (null = default) over the bundled defaults. */
export function mergePublished(items) {
  const merged = defaultSiteAssets();
  if (!items || typeof items !== 'object') return merged;
  for (const slot of Object.keys(merged)) {
    const published = items[slot];
    if (published && typeof published.url === 'string' && published.url) {
      merged[slot] = {
        kind: published.kind === 'video' ? 'video' : 'image',
        url: published.url,
        alt: published.alt ?? null,
        width: published.width ?? null,
        height: published.height ?? null,
        isDefault: false
      };
    }
  }
  return merged;
}

const SiteAssetsContext = createContext(null);

export function SiteAssetsProvider({ children }) {
  const [assets, setAssets] = useState(defaultSiteAssets);
  // 'loading' until the API answers, then 'ready'; 'error' if it never does.
  const [status, setStatus] = useState('loading');
  // Slots whose published file failed to load in this session.
  const [failed, setFailed] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    clearLegacyMemo();
    fetch(`${apiBase()}${ASSETS_PATH}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setStatus('error');
          return;
        }
        setAssets(mergePublished(data.items));
        setStatus('ready');
      })
      .catch(() => {
        // Keep the defaults; slots without one settle on their empty state.
        if (!cancelled) setStatus('error');
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
