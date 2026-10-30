/**
 * Local static server for the prerendered build that emulates how Vercel
 * routes this project (vercel.json), so routing can be checked before a
 * Preview deployment:
 *
 *   1. `trailingSlash: false`: `/x/` → 308 `/x` (query kept).
 *   2. vercel.json `headers` whose `source` matches the request path.
 *   3. Filesystem first: dist/<path> as a file, else dist/<path>/index.html
 *      (`cleanUrls: false`, so `.html` URLs are plain files too).
 *   4. vercel.json `rewrites`, in order: `/api/*` destinations go to the API
 *      (stubbed from the seed catalog, or proxied with --api <origin>),
 *      anything else serves that file from dist/ with status 200.
 *   5. Nothing matched: dist/404.html with status 404.
 *
 *   npm run serve:dist -- [--port 4173] [--api http://localhost:3003]
 *
 * Dependency-free (node:http). Not a production server.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeedData } from './prerenderData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

interface VercelConfig {
  trailingSlash?: boolean;
  rewrites?: { source: string; destination: string }[];
  headers?: { source: string; headers: { key: string; value: string }[] }[];
}

const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as VercelConfig;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const PORT = Number(arg('port') ?? process.env.PORT ?? 4173);
const API_ORIGIN = arg('api');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

/** vercel.json `source` (path-to-regexp style) → RegExp: `:name` is one segment, `(...)` stays a regex group. */
function sourceToRegExp(source: string): RegExp {
  const pattern = source.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '([^/]+)');
  return new RegExp(`^${pattern}$`);
}

function substitute(destination: string, match: RegExpMatchArray): string {
  return destination.replace(/\$(\d+)/g, (_, index: string) => match[Number(index)] ?? '');
}

const rewrites = (config.rewrites ?? []).map((rule) => ({ ...rule, regex: sourceToRegExp(rule.source) }));
const headerRules = (config.headers ?? []).map((rule) => ({ ...rule, regex: sourceToRegExp(rule.source) }));

/** A file under dist/ for a URL path (file, then directory index), or null. */
function resolveFile(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const target = normalize(join(DIST, decoded));
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  const index = join(target, 'index.html');
  if (existsSync(index) && statSync(index).isFile()) return index;
  return null;
}

function sendFile(req: IncomingMessage, res: ServerResponse, file: string, status = 200): void {
  res.statusCode = status;
  res.setHeader('Content-Type', CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Content-Length', statSync(file).size);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(payload));
  res.end(payload);
}

const seed = loadSeedData();

/** Stub of the API from the seed catalog (the same data a seed prerender embeds). */
function stubApi(pathname: string, res: ServerResponse): void {
  if (pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', stub: true });
    return;
  }
  const list = /^\/api\/v1\/(lodges|guides)$/.exec(pathname);
  if (list) {
    const items = seed.catalog[list[1] as 'lodges' | 'guides'];
    sendJson(res, 200, { items, pagination: { limit: 50, offset: 0, count: items.length } });
    return;
  }
  const detail = /^\/api\/v1\/(lodges|guides)\/([^/]+)(\/reviews)?$/.exec(pathname);
  if (detail) {
    const found = seed.details.find(
      (entry) => entry.catalogType === detail[1] && String(entry.item.productId) === detail[2]
    );
    if (!found) {
      sendJson(res, 404, { error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
    sendJson(res, 200, detail[3] ? found.reviews : found.item);
    return;
  }
  if (pathname === '/api/v1/site/assets') {
    sendJson(res, 200, seed.siteAssets);
    return;
  }
  sendJson(res, 501, { error: `Not stubbed by serveDist: ${pathname}` });
}

function proxyApi(req: IncomingMessage, res: ServerResponse, path: string): void {
  const target = new URL(path, API_ORIGIN);
  const upstream = httpRequest(
    target,
    { method: req.method, headers: { ...req.headers, host: target.host } },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    }
  );
  upstream.on('error', (error) => sendJson(res, 502, { error: error.message }));
  req.pipe(upstream);
}

function handleApi(req: IncomingMessage, res: ServerResponse, original: URL, destination: string): void {
  const dest = new URL(destination, 'http://localhost');
  // `/api/v1?path=lodges/1` (the vercel.json rewrite) → `/api/v1/lodges/1`, like v1Router does.
  const pathQuery = dest.searchParams.get('path');
  const pathname = dest.pathname === '/api/v1' && pathQuery ? `/api/v1/${pathQuery}` : dest.pathname;
  if (API_ORIGIN) {
    proxyApi(req, res, `${pathname}${original.search}`);
    return;
  }
  stubApi(pathname, res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const { pathname } = url;
  const log = (status: number | string, note = '') => console.log(`${req.method} ${req.url} → ${status}${note}`);

  // 1. trailingSlash: false
  if (config.trailingSlash === false && pathname.length > 1 && pathname.endsWith('/')) {
    res.statusCode = 308;
    res.setHeader('Location', `${pathname.replace(/\/+$/, '') || '/'}${url.search}`);
    res.end();
    log(308);
    return;
  }

  // 2. headers
  for (const rule of headerRules) {
    if (rule.regex.test(pathname)) for (const header of rule.headers) res.setHeader(header.key, header.value);
  }

  // 3. filesystem
  const file = resolveFile(pathname);
  if (file) {
    sendFile(req, res, file);
    log(200, ` ${file.slice(DIST.length)}`);
    return;
  }

  // 4. rewrites
  for (const rule of rewrites) {
    const match = pathname.match(rule.regex);
    if (!match) continue;
    const destination = substitute(rule.destination, match);
    if (destination.startsWith('/api/')) {
      handleApi(req, res, url, destination);
      log('api', ` ${destination}`);
      return;
    }
    const rewritten = resolveFile(destination);
    if (rewritten) {
      sendFile(req, res, rewritten);
      log(200, ` rewrite → ${destination}`);
      return;
    }
  }

  // Direct /api/* function paths (e.g. /api/health without the rewrite).
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, url, pathname);
    log('api');
    return;
  }

  // 5. 404.html
  const notFound = join(DIST, '404.html');
  if (existsSync(notFound)) {
    sendFile(req, res, notFound, 404);
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
  log(404);
});

server.listen(PORT, () => {
  console.log(`serveDist: http://localhost:${PORT} (dist/, vercel.json routing, API ${API_ORIGIN ? `→ ${API_ORIGIN}` : 'stubbed from the seed catalog'})`);
});
