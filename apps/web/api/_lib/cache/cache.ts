import { createLogger } from '../utils/logger.js';

const log = createLogger('cache');

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
}

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

/** Per-instance fallback. Survives warm invocations only. */
class MemoryCache implements Cache {
  private readonly store = new Map<string, MemoryEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

/**
 * Vercel KV / Upstash Redis over its REST API. Kept dependency-free on
 * purpose: the API surface we need is only GET/SET/DEL/SCAN.
 */
class KvRestCache implements Cache {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  private async command<T>(parts: (string | number)[]): Promise<T | null> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parts)
    });

    if (!response.ok) {
      log.warn('KV command failed', { status: response.status, command: String(parts[0]) });
      return null;
    }

    const data = (await response.json()) as { result: T };
    return data.result;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.command<string | null>(['GET', key]);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.command(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]);
  }

  async delete(key: string): Promise<void> {
    await this.command(['DEL', key]);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const result = await this.command<[string, string[]]>([
        'SCAN',
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100
      ]);
      if (!result) return;
      const [nextCursor, keys] = result;
      if (keys.length > 0) {
        await this.command(['DEL', ...keys]);
      }
      cursor = nextCursor;
    } while (cursor !== '0');
  }
}

let instance: Cache | undefined;

export function getCache(): Cache {
  if (instance) return instance;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    log.info('Using KV REST cache');
    instance = new KvRestCache(url, token);
  } else {
    log.info('Using in-memory cache (no KV configured)');
    instance = new MemoryCache();
  }

  return instance;
}

/** Read-through helper that logs hits and misses consistently. */
export async function withCache<T>(
  cache: Cache,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    log.debug('Cache hit', { key });
    return cached;
  }

  log.debug('Cache miss', { key });
  const value = await loader();
  await cache.set(key, value, ttlSeconds);
  return value;
}
