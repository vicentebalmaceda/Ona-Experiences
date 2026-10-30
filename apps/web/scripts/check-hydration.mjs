/**
 * Opens prerendered pages in headless Chrome and reports React hydration
 * problems: console errors/warnings, uncaught exceptions, and whether React
 * replaced the server markup in #root instead of adopting it.
 *
 *   node --experimental-websocket scripts/check-hydration.mjs <base-url> [path ...]
 *   (Node ≥ 22 has WebSocket built in; the flag is only needed on Node 21.)
 *
 * Uses the Chrome DevTools Protocol directly (no puppeteer). CHROME_PATH
 * overrides the browser binary. Exits non-zero when a page has a problem.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base = 'http://localhost:4173', ...rest] = process.argv.slice(2);
const paths = rest.length ? rest : ['/', '/en'];
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + Math.floor(Math.random() * 500);
const SETTLE_MS = 3000;

if (typeof WebSocket === 'undefined') {
  console.error('No global WebSocket: run with `node --experimental-websocket` (Node 21) or Node ≥ 22.');
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), 'ona-hydration-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank'
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function devtools(path, init) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}${path}`, init);
      if (response.ok) return response.json();
    } catch {
      // Chrome still starting.
    }
    await sleep(200);
  }
  throw new Error(`Chrome DevTools did not answer ${path}`);
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      for (const listener of listeners) listener(message);
    }
  });
  return new Promise((resolve, reject) => {
    socket.addEventListener('error', () => reject(new Error('DevTools socket error')));
    socket.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          id += 1;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }));
        },
        on(listener) {
          listeners.push(listener);
        },
        close() {
          socket.close();
        }
      })
    );
  });
}

// Runs before any page script: records whether React swaps out #root's server children.
const OBSERVER = `
  window.__hydrationProbe = { serverChildren: 0, removedServerChildren: 0, mutations: 0 };
  document.addEventListener('readystatechange', () => {
    const root = document.getElementById('root');
    if (!root || window.__hydrationProbe.observing) return;
    window.__hydrationProbe.observing = true;
    const initial = new Set(root.childNodes);
    window.__hydrationProbe.serverChildren = initial.size;
    new MutationObserver((records) => {
      for (const record of records) {
        window.__hydrationProbe.mutations += 1;
        if (record.target === root) {
          for (const node of record.removedNodes) if (initial.has(node)) window.__hydrationProbe.removedServerChildren += 1;
        }
      }
    }).observe(root, { childList: true, subtree: true });
  });
`;

async function checkPage(path) {
  const target = await devtools('/json/new?about:blank', { method: 'PUT' });
  const page = await connect(target.webSocketDebuggerUrl);
  const problems = [];
  page.on((message) => {
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(message.params.type)) {
      const text = message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ');
      problems.push(`console.${message.params.type}: ${text.slice(0, 300)}`);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      problems.push(`exception: ${(details.exception?.description || details.text || '').slice(0, 300)}`);
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      // The document's own status (404.html answers with 404) is not a page problem.
      if (message.params.entry.url === `${base}${path}` && message.params.entry.source === 'network') return;
      problems.push(`log: ${message.params.entry.text.slice(0, 300)} (${message.params.entry.url || ''})`);
    }
  });
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER });
  await page.send('Page.navigate', { url: `${base}${path}` });
  await sleep(SETTLE_MS);
  const { result } = await page.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      probe: window.__hydrationProbe,
      hasData: Boolean(window.__ONA_DATA__),
      h1: document.querySelector('h1')?.textContent ?? null,
      lang: document.documentElement.lang,
      title: document.title,
      canonical: document.querySelector('link[rel=canonical]')?.href ?? null,
      jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length
    })`,
    returnByValue: true
  });
  page.close();
  await devtools(`/json/close/${target.id}`).catch(() => {});
  const state = JSON.parse(result.value);
  if (!state.probe || state.probe.serverChildren === 0) problems.push('no prerendered #root content');
  if (state.probe?.removedServerChildren > 0) problems.push('React replaced the server markup (hydration failed)');
  return { path, state, problems };
}

let failed = false;
try {
  await devtools('/json/version');
  for (const path of paths) {
    const { state, problems } = await checkPage(path);
    const ok = problems.length === 0;
    failed ||= !ok;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${path}  lang=${state.lang} h1="${state.h1}" data=${state.hasData} ` +
      `serverChildren=${state.probe?.serverChildren} replaced=${state.probe?.removedServerChildren} ` +
      `domMutationsAfterLoad=${state.probe?.mutations} jsonLd=${state.jsonLd}`);
    for (const problem of problems) console.log(`      ${problem}`);
  }
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
