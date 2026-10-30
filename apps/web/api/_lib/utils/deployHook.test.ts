import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cache } from '../cache/cache.js';
import { REBUILD_DEDUPE_KEY, triggerRebuild } from './deployHook.js';

function memoryCache(): Cache {
  const store = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
    set: async (key, value) => {
      store.set(key, value);
    },
    delete: async (key) => {
      store.delete(key);
    },
    deleteByPrefix: async () => {}
  };
}

describe('triggerRebuild', () => {
  const original = process.env.VERCEL_DEPLOY_HOOK_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_DEPLOY_HOOK_URL;
    else process.env.VERCEL_DEPLOY_HOOK_URL = original;
  });

  it('is a no-op when VERCEL_DEPLOY_HOOK_URL is unset', async () => {
    delete process.env.VERCEL_DEPLOY_HOOK_URL;
    const fetchImpl = vi.fn();
    const result = await triggerRebuild('test', { fetchImpl: fetchImpl as never });
    expect(result).toEqual({ triggered: false, skipped: 'unconfigured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs to the hook URL from the environment', async () => {
    process.env.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/prj/abc';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    const result = await triggerRebuild('test', { fetchImpl: fetchImpl as never });
    expect(result).toEqual({ triggered: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.vercel.com/v1/integrations/deploy/prj/abc',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('never throws: network errors and non-2xx answers come back as results', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      triggerRebuild('test', { hookUrl: 'https://hook', fetchImpl: failing as never })
    ).resolves.toEqual({ triggered: false, error: 'ECONNRESET' });
    const rejected = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    const result = await triggerRebuild('test', { hookUrl: 'https://hook', fetchImpl: rejected as never });
    expect(result.triggered).toBe(false);
    expect(result.error).toContain('500');
  });

  it('coalesces a second trigger inside the dedupe window', async () => {
    const cache = memoryCache();
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    const options = { hookUrl: 'https://hook', fetchImpl: fetchImpl as never, cache, dedupeWindowSeconds: 60 };
    expect(await triggerRebuild('first', options)).toEqual({ triggered: true });
    expect(await cache.get(REBUILD_DEDUPE_KEY)).not.toBeNull();
    expect(await triggerRebuild('second', options)).toEqual({ triggered: false, skipped: 'coalesced' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
