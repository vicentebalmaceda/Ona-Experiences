import type { VercelRequest, VercelResponse } from '@vercel/node';

const localhostOriginPattern = /^https?:\/\/localhost(:\d+)?$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (process.env.NODE_ENV !== 'production' && localhostOriginPattern.test(origin)) return true;

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * Applies CORS headers. Returns true when the request was fully handled
 * (OPTIONS preflight) and the route handler should not run.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;

  res.setHeader('Vary', 'Origin');
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    const requestedHeaders = req.headers['access-control-request-headers'];
    if (typeof requestedHeaders === 'string') {
      res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
    }
    res.status(204).end();
    return true;
  }

  return false;
}
