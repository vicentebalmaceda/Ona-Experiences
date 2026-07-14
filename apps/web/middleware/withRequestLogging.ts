import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestId } from '../utils/http';
import { createLogger } from '../utils/logger';
import type { ApiHandler } from './withErrorHandler';

const log = createLogger('http');

export function withRequestLogging(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    const start = Date.now();
    const requestId = getRequestId(req);
    res.setHeader('X-Request-Id', requestId);

    log.info('Incoming request', {
      requestId,
      method: req.method,
      path: req.url
    });

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      log[level]('Request completed', {
        requestId,
        method: req.method,
        path: req.url,
        statusCode: res.statusCode,
        durationMs
      });
    });

    await handler(req, res);
  };
}
