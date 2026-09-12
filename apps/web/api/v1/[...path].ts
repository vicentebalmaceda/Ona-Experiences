import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/middleware/cors.js';
import { matchV1Route, mergeV1Query } from '../_lib/v1Router.js';

function pathnameFromRequest(url: string | undefined, pathQuery: string | string[] | undefined): string {
  if (pathQuery !== undefined) {
    const segments = Array.isArray(pathQuery) ? pathQuery : [pathQuery];
    return `/api/v1/${segments.filter(Boolean).join('/')}`;
  }
  return new URL(url ?? '/', 'http://localhost').pathname;
}

export default async function v1CatchAll(req: VercelRequest, res: VercelResponse): Promise<void> {
  const pathname = pathnameFromRequest(req.url, req.query.path);
  const match = matchV1Route(pathname);
  if (!match) {
    if (applyCors(req, res)) return;
    res.status(404).json({ error: 'Not found' });
    return;
  }

  req.query = mergeV1Query(req.query, match.params);
  await match.handler(req, res);
}
