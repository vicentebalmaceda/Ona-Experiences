import type { Cache } from '../cache/cache.js';
import { createLogger } from './logger.js';

const log = createLogger('deploy-hook');

/** Cache key that coalesces bursts of rebuild requests (e.g. a bulk BSale edit). */
export const REBUILD_DEDUPE_KEY = 'deploy-hook:last-trigger';

export interface RebuildResult {
  /** True when the deploy hook accepted the request. */
  triggered: boolean;
  /** Why nothing was sent: no hook configured, or a rebuild was requested moments ago. */
  skipped?: 'unconfigured' | 'coalesced';
  /** Set when the hook call failed (network error or non-2xx answer). */
  error?: string;
}

export interface TriggerRebuildOptions {
  /** Defaults to `process.env.VERCEL_DEPLOY_HOOK_URL`. */
  hookUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * With a cache, a second trigger within `dedupeWindowSeconds` of the last one
   * is skipped: one Vercel build already picks up every change made before its
   * prerender step loads data.
   */
  cache?: Cache;
  dedupeWindowSeconds?: number;
}

/**
 * Asks Vercel to rebuild (and so re-prerender) the site through a Deploy Hook,
 * so the static HTML follows content changes (BSale catalog, site assets).
 *
 * A no-op with a log line when `VERCEL_DEPLOY_HOOK_URL` is unset (local dev,
 * previews). It never throws: a failed rebuild must not fail the webhook or
 * admin action that asked for it; the daily scheduled rebuild catches up.
 */
export async function triggerRebuild(reason: string, options: TriggerRebuildOptions = {}): Promise<RebuildResult> {
  const hookUrl = options.hookUrl ?? process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    log.info('VERCEL_DEPLOY_HOOK_URL not set; skipping site rebuild', { reason });
    return { triggered: false, skipped: 'unconfigured' };
  }

  try {
    if (options.cache && options.dedupeWindowSeconds) {
      const recent = await options.cache.get<{ at: string }>(REBUILD_DEDUPE_KEY);
      if (recent) {
        log.info('Site rebuild requested recently; coalescing', { reason, lastAt: recent.at });
        return { triggered: false, skipped: 'coalesced' };
      }
    }

    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(hookUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000)
    });
    if (!response.ok) {
      const error = `deploy hook answered ${response.status}`;
      log.error('Site rebuild request failed', { reason, status: response.status });
      return { triggered: false, error };
    }

    if (options.cache && options.dedupeWindowSeconds) {
      await options.cache.set(REBUILD_DEDUPE_KEY, { at: new Date().toISOString() }, options.dedupeWindowSeconds);
    }
    log.info('Site rebuild requested', { reason });
    return { triggered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Site rebuild request failed', { reason, message });
    return { triggered: false, error: message };
  }
}
