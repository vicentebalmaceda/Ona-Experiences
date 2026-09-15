import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/middleware/cors.js';
import { matchV1Route, mergeV1Query, pathnameFromV1Request } from '../_lib/v1Router.js';

export default async function v1Entry(req: VercelRequest, res: VercelResponse): Promise<void> {
  const pathname = pathnameFromV1Request(req.url, req.query.path);
  const match = matchV1Route(pathname);
  if (!match) {
    if (applyCors(req, res)) return;
    res.status(404).json({ error: 'Not found' });
    return;
  }

  req.query = mergeV1Query(req.query, match.params);
  await match.handler(req, res);
}
