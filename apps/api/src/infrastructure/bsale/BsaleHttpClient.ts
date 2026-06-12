import type { Env } from '../../config/env.js';
import { createLogger } from '../../shared/logger.js';
import { BsaleApiError } from './BsaleApiError.js';

const log = createLogger('bsale');

export interface BsaleListResponse<T> {
  items: T[];
  count: number;
  limit: number;
  offset: number;
}

export class BsaleHttpClient {
  private readonly baseUrl: string;

  constructor(private readonly env: Env) {
    this.baseUrl = env.BSALE_API_BASE_URL.replace(/\/$/, '');
  }

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const requestUrl = url.toString();
    log.debug('BSale request', { method: 'GET', url: requestUrl });

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        access_token: this.env.BSALE_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    log.debug('BSale response', { url: requestUrl, status: response.status });
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error: string }).error)
          : `BSale API error: ${response.status}`;
      log.warn('BSale request failed', { url: requestUrl, status: response.status, message });
      throw new BsaleApiError(message, response.status, body);
    }

    return body as T;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  private async request<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    log.debug('BSale request', { method, url });

    const response = await fetch(url, {
      method,
      headers: {
        access_token: this.env.BSALE_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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
  }
}
