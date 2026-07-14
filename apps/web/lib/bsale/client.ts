import type { Env } from '../../config/env';
import { BsaleApiError } from '../../types/errors';
import { createLogger } from '../../utils/logger';

const log = createLogger('bsale');

const MAX_CONCURRENT_REQUESTS = 4;
const MAX_GET_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

type QueryParams = Record<string, string | number | undefined>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Minimal semaphore limiting concurrent BSale requests per instance, so
 * catalog fan-out (variants per product) does not hammer the BSale API.
 */
class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.queue.shift()?.();
    }
  }
}

export class BsaleClient {
  private readonly baseUrl: string;
  private readonly limiter = new ConcurrencyLimiter(MAX_CONCURRENT_REQUESTS);

  constructor(private readonly env: Env) {
    this.baseUrl = env.BSALE_API_BASE_URL.replace(/\/$/, '');
  }

  async get<T>(path: string, query?: QueryParams): Promise<T> {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // GETs are idempotent, so they retry on 429/5xx and network failures.
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_GET_ATTEMPTS; attempt += 1) {
      try {
        return await this.request<T>('GET', url.toString());
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof BsaleApiError
            ? isRetryableStatus(error.statusCode)
            : !(error instanceof BsaleApiError);

        if (!retryable || attempt === MAX_GET_ATTEMPTS) throw error;

        const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        log.warn('Retrying BSale GET', { url: url.toString(), attempt, delayMs });
        await sleep(delayMs);
      }
    }
    throw lastError;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', this.buildUrl(path), body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', this.buildUrl(path), body);
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private async request<T>(method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown): Promise<T> {
    return this.limiter.run(async () => {
      log.debug('BSale request', { method, url });

      const response = await fetch(url, {
        method,
        headers: {
          access_token: this.env.BSALE_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });

      const text = await response.text();
      log.debug('BSale response', { url, status: response.status });

      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : undefined;
      } catch {
        parsed = text;
      }

      if (!response.ok) {
        const message =
          typeof parsed === 'object' && parsed !== null && 'error' in parsed
            ? String((parsed as { error: string }).error)
            : `BSale API error: ${response.status}`;
        log.warn('BSale request failed', { url, status: response.status, message });
        throw new BsaleApiError(message, response.status, parsed);
      }

      return parsed as T;
    });
  }
}
