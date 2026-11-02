import { createLogger } from '../../utils/logger.js';

const log = createLogger('google-translator');

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
/** Google's recommended maximum per text segment. */
const SEGMENT_MAX_CHARS = 5000;
/** Kept under the v2 per-request limits (30k code points, 128 segments). */
const REQUEST_MAX_CHARS = 25000;
const REQUEST_MAX_SEGMENTS = 100;

export interface Translator {
  /** Translates HTML, keeping its markup. Throws when the translation fails. */
  translateHtml(html: string, options: { from: string; to: string }): Promise<string>;
}

/** No API key configured: every translation fails, so callers fall back to the source. */
export class UnconfiguredTranslator implements Translator {
  async translateHtml(): Promise<string> {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not set');
  }
}

/**
 * Drops what the description sanitizer removes anyway (comments, scripts,
 * styles and every attribute but href/target/rel), so BSale's inline-styled
 * HTML costs a fraction of the characters to translate. The result still goes
 * through sanitizeMarketDescription before it is rendered.
 */
export function compactHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<([a-z][a-z0-9]*)\b([^>]*)>/gi, (_tag, name: string, attrs: string) => {
      const kept = [...attrs.matchAll(/\s(href|target|rel)\s*=\s*("[^"]*"|'[^']*')/gi)].map(
        (match) => ` ${match[1].toLowerCase()}=${match[2]}`
      );
      const selfClosing = /\/\s*$/.test(attrs) ? ' /' : '';
      return `<${name}${kept.join('')}${selfClosing}>`;
    })
    .replace(/[ \t]*\n[\s]*/g, '\n')
    .trim();
}

/**
 * Splits HTML after block-level closing tags into segments of at most
 * SEGMENT_MAX_CHARS (a single longer block stays whole), so each segment is
 * close to a balanced fragment and their translations concatenate back.
 */
export function splitHtml(html: string, max = SEGMENT_MAX_CHARS): string[] {
  if (html.length <= max) return [html];
  const blocks = html.split(/(?<=<\/(?:p|div|ul|ol|h[1-6]|table|blockquote)>)/i);
  const segments: string[] = [];
  let current = '';
  for (const block of blocks) {
    if (current && current.length + block.length > max) {
      segments.push(current);
      current = '';
    }
    current += block;
  }
  if (current) segments.push(current);
  return segments;
}

function batches(segments: string[]): string[][] {
  const result: string[][] = [];
  let batch: string[] = [];
  let size = 0;
  for (const segment of segments) {
    if (batch.length && (size + segment.length > REQUEST_MAX_CHARS || batch.length >= REQUEST_MAX_SEGMENTS)) {
      result.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(segment);
    size += segment.length;
  }
  if (batch.length) result.push(batch);
  return result;
}

interface GoogleTranslateResponse {
  data?: { translations?: { translatedText?: string }[] };
}

/** Cloud Translation API (Basic, v2) with an API key, in HTML mode. */
export class GoogleTranslator implements Translator {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async translateHtml(html: string, { from, to }: { from: string; to: string }): Promise<string> {
    const segments = splitHtml(compactHtml(html));
    const translated: string[] = [];
    for (const q of batches(segments)) {
      const response = await this.fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.apiKey },
        body: JSON.stringify({ q, source: from, target: to, format: 'html' })
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        log.warn('Google Translate request failed', { status: response.status, body: body.slice(0, 500) });
        throw new Error(`Google Translate answered ${response.status}`);
      }
      const payload = (await response.json()) as GoogleTranslateResponse;
      const texts = payload.data?.translations?.map((entry) => entry.translatedText);
      if (!texts || texts.length !== q.length || texts.some((text) => typeof text !== 'string')) {
        throw new Error('Google Translate returned an unexpected payload');
      }
      translated.push(...(texts as string[]));
    }
    return translated.join('');
  }
}

/** The Google translator, or one that always fails when no API key is configured. */
export function createTranslator(apiKey: string | undefined): Translator {
  return apiKey ? new GoogleTranslator(apiKey) : new UnconfiguredTranslator();
}
