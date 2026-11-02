import { describe, expect, it, vi } from 'vitest';
import { compactHtml, GoogleTranslator, splitHtml } from './googleTranslator.js';

function okResponse(texts: string[]) {
  return new Response(JSON.stringify({ data: { translations: texts.map((translatedText) => ({ translatedText })) } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('compactHtml', () => {
  it('drops comments, styles and attributes the sanitizer would remove, keeping links', () => {
    const html =
      '<!-- x --><style>p{}</style><p style="color:red" class="a">Hola <a href="https://ona.cl" style="x" target="_blank">aquí</a><br/></p>';
    expect(compactHtml(html)).toBe('<p>Hola <a href="https://ona.cl" target="_blank">aquí</a><br /></p>');
  });
});

describe('splitHtml', () => {
  it('keeps short HTML whole', () => {
    expect(splitHtml('<p>a</p><p>b</p>', 100)).toEqual(['<p>a</p><p>b</p>']);
  });

  it('splits after block closing tags into segments under the limit', () => {
    const html = '<p>aaaa</p><p>bbbb</p><p>cccc</p>';
    expect(splitHtml(html, 22)).toEqual(['<p>aaaa</p><p>bbbb</p>', '<p>cccc</p>']);
    expect(splitHtml(html, 22).join('')).toBe(html);
  });
});

describe('GoogleTranslator', () => {
  it('posts HTML-mode requests with the key in a header and joins the segments', async () => {
    const fetchImpl = vi.fn(async () => okResponse(['<p>Hello</p>']));
    const translator = new GoogleTranslator('test-key', fetchImpl as unknown as typeof fetch);

    await expect(translator.translateHtml('<p style="x">Hola</p>', { from: 'es', to: 'en' })).resolves.toBe('<p>Hello</p>');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain('test-key');
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe('test-key');
    expect(JSON.parse(init.body as string)).toEqual({ q: ['<p>Hola</p>'], source: 'es', target: 'en', format: 'html' });
  });

  it('throws on an error answer', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 403 }));
    const translator = new GoogleTranslator('k', fetchImpl as unknown as typeof fetch);

    await expect(translator.translateHtml('<p>Hola</p>', { from: 'es', to: 'en' })).rejects.toThrow('403');
  });
});
