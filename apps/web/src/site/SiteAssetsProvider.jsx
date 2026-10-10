import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SLOT_RULES } from '../../shared/siteAssetSlots.ts';

/**
 * Admin-managed site assets (hero, hero poster, logo).
 *
 * The public site renders the bundled defaults immediately, then swaps to
 * whatever an Admin published once `/api/v1/site/assets` answers. The last
 * known answer is memoized in localStorage so repeat visits do not flash the
 * default. A load error on a published file (deleted blob, blocked store)
 * falls back to the default for that slot via `onError`.
 */

const STORAGE_KEY = 'ona-site-assets';
const ASSETS_PATH = '/api/v1/site/assets';

function apiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\/$/, '');
}

export function defaultSiteAssets() {
  return Object.fromEntries(
    Object.entries(SLOT_RULES).map(([slot, rules]) => [
      slot,
      { kind: rules.defaultKind, url: rules.defaultUrl, alt: null, width: null, height: null, isDefault: true }
    ])
  );
}

function readMemo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeMemo(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode or quota: the site still works without the memo.
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
  const [assets, setAssets] = useState(() => mergePublished(readMemo()));
  // Slots whose published file failed to load in this session.
  const [failed, setFailed] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}${ASSETS_PATH}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        writeMemo(data.items);
        setAssets(mergePublished(data.items));
      })
      .catch(() => {
        // Keep whatever we have (memo or defaults).
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

  const value = useMemo(() => ({ assets, failed, markFailed }), [assets, failed, markFailed]);

  return <SiteAssetsContext.Provider value={value}>{children}</SiteAssetsContext.Provider>;
}

/**
 * Returns `{ kind, url, alt, width, height, isDefault, onError }` for a slot.
 * Attach `onError` to the <img>/<video> so a broken published file degrades
 * to the bundled default instead of a blank.
 */
export function useSiteAsset(slot) {
  const context = useContext(SiteAssetsContext);
  const rules = SLOT_RULES[slot];
  if (!rules) {
    throw new Error(`Unknown site asset slot: ${slot}`);
  }

  const fallback = {
    kind: rules.defaultKind,
    url: rules.defaultUrl,
    alt: null,
    width: null,
    height: null,
    isDefault: true
  };

  const asset = context?.assets?.[slot] ?? fallback;
  const useFallback = asset.isDefault || context?.failed?.has(slot);
  const resolved = useFallback ? fallback : asset;
  const markFailed = context?.markFailed;

  return {
    ...resolved,
    onError: () => {
      if (!resolved.isDefault && markFailed) markFailed(slot);
    }
  };
}
