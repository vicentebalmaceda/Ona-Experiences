// @vitest-environment jsdom
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from './entry-server.jsx';
import ClientApp from './ClientApp.jsx';
import { createI18n } from './i18n/index.js';
import { homeData, lodgeData } from './test/fixtures.js';

/**
 * Server HTML → hydrateRoot with the browser's tree (development React, which
 * reports every text/attribute mismatch through console.error). The API answers
 * with the embedded data, so revalidation after mount must not change the DOM.
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function apiFor(data) {
  return async (url) => {
    const { pathname } = new URL(url, 'http://localhost');
    let body = null;
    if (pathname === '/api/v1/site/assets') body = data.siteAssets;
    else if (pathname === '/api/v1/lodges') body = { items: data.catalog?.lodges ?? [] };
    else if (pathname === '/api/v1/guides') body = { items: data.catalog?.guides ?? [] };
    else if (data.detail && pathname.endsWith('/reviews')) body = data.detail.reviews;
    else if (data.detail) body = data.detail.item;
    return new Response(JSON.stringify(body), { status: body ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  };
}

async function hydrate(path, data, errors) {
  const { html } = render(path, data);
  // Only the client side counts: under jsdom `window` exists during the server
  // render too, which makes LocaleLayout pick useLayoutEffect and React warn.
  // The real prerender runs in plain Node, where it uses useEffect.
  errors.length = 0;
  window.history.replaceState(null, '', path);
  document.body.innerHTML = `<div id="root">${html}</div>`;
  const container = document.getElementById('root');
  window.__ONA_DATA__ = data;
  vi.stubGlobal('fetch', vi.fn(apiFor(data)));

  const serverHtml = container.innerHTML;
  const mutations = [];
  const observer = new MutationObserver(records => mutations.push(...records));
  let root;
  await act(async () => {
    root = hydrateRoot(container, <ClientApp data={data} i18n={createI18n(data.lang)} />, {
      onRecoverableError: error => console.error('recoverable', error)
    });
  });
  observer.observe(container, { childList: true, subtree: true, characterData: true });
  // Let the revalidation requests resolve.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  observer.disconnect();
  return { root, container, serverHtml, mutations };
}

describe('hydration of prerendered pages', () => {
  let errors;

  beforeEach(() => {
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.map(String).join(' ')));
    // jsdom lacks these; the maps then stay unloaded placeholders.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete window.__ONA_DATA__;
  });

  const cases = [
    ['es home', '/', homeData('/')],
    ['en home', '/en', homeData('/en', 'en')],
    ['es lodge', '/lodges/bio-bio-lodge-65561', lodgeData('/lodges/bio-bio-lodge-65561')]
  ];

  it.each(cases)('%s hydrates without warnings and revalidation changes nothing', async (_name, path, data) => {
    const { root, container, serverHtml, mutations } = await hydrate(path, data, errors);
    expect(errors).toEqual([]);
    // The server markup was adopted, not replaced, and the unchanged API answer left the content alone.
    expect(mutations.filter(record => record.type !== 'attributes')).toEqual([]);
    expect(container.querySelector('h1')).not.toBeNull();
    expect(serverHtml.length).toBeGreaterThan(1000);
    act(() => root.unmount());
  });
});
