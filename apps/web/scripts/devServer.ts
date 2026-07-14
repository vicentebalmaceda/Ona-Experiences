/**
 * Minimal local adapter that serves the Vercel serverless functions in api/
 * over plain Node HTTP, emulating @vercel/node's req/res helpers.
 *
 * Use `npm run dev:bff` (vercel dev) when the Vercel CLI is available; this
 * script is a dependency-free fallback for local development and smoke tests.
 *
 * Env vars are read from apps/web/.env when present (BSALE_* etc.).
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(path: string): void {
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

loadDotEnv(resolve(__dirname, '../.env'));

// `any` so the enhanced Node req/res satisfy the VercelRequest/VercelResponse
// signatures of the imported handlers without a full type-level emulation.
type Handler = (req: any, res: any) => Promise<void> | void;

interface Route {
  pattern: RegExp;
  paramNames: string[];
  load: () => Promise<{ default: Handler }>;
}

const routes: Route[] = [
  {
    pattern: /^\/(?:api\/)?health$/,
    paramNames: [],
    load: () => import('../api/health.js')
  },
  {
    pattern: /^\/api\/v1\/lodges$/,
    paramNames: [],
    load: () => import('../api/v1/lodges/index.js')
  },
  {
    pattern: /^\/api\/v1\/lodges\/([^/]+)$/,
    paramNames: ['productId'],
    load: () => import('../api/v1/lodges/[productId]/index.js')
  },
  {
    pattern: /^\/api\/v1\/lodges\/([^/]+)\/sales$/,
    paramNames: ['productId'],
    load: () => import('../api/v1/lodges/[productId]/sales.js')
  },
  {
    pattern: /^\/api\/v1\/guides$/,
    paramNames: [],
    load: () => import('../api/v1/guides/index.js')
  },
  {
    pattern: /^\/api\/v1\/guides\/([^/]+)$/,
    paramNames: ['productId'],
    load: () => import('../api/v1/guides/[productId]/index.js')
  },
  {
    pattern: /^\/api\/v1\/guides\/([^/]+)\/sales$/,
    paramNames: ['productId'],
    load: () => import('../api/v1/guides/[productId]/sales.js')
  },
  {
    pattern: /^\/api\/webhooks\/bsale$/,
    paramNames: [],
    load: () => import('../api/webhooks/bsale.js')
  }
];

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function enhance(req: IncomingMessage, res: ServerResponse, params: Record<string, string>, body: unknown) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const query: Record<string, string> = { ...params };
  for (const [key, value] of url.searchParams.entries()) {
    if (!(key in query)) query[key] = value;
  }

  const vercelReq = Object.assign(req, { query, body });
  const vercelRes = Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return vercelRes;
    },
    json(payload: unknown) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
      return vercelRes;
    },
    send(payload: unknown) {
      if (typeof payload === 'object') return vercelRes.json(payload);
      res.end(String(payload));
      return vercelRes;
    }
  });

  return { vercelReq, vercelRes };
}

const port = Number(process.env.BFF_PORT ?? 3003);

createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  const route = routes.find((candidate) => candidate.pattern.test(pathname));

  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const match = pathname.match(route.pattern)!;
  const params: Record<string, string> = {};
  route.paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });

  const body = await readBody(req);
  const { vercelReq, vercelRes } = enhance(req, res, params, body);
  const { default: handler } = await route.load();
  await handler(vercelReq, vercelRes);
}).listen(port, () => {
  console.log(`BFF dev server listening on http://localhost:${port}`);
});
