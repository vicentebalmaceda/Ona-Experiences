import type { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../domain/errors/DomainError.js';
import { BsaleApiError } from '../../../infrastructure/bsale/BsaleApiError.js';
import { createLogger } from '../../../shared/logger.js';

const log = createLogger('http');

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof DomainError) {
    log.warn('Domain error', {
      path: req.originalUrl,
      statusCode: error.statusCode,
      message: error.message,
      code: error.code
    });
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }

  if (error instanceof BsaleApiError) {
    const status = error.statusCode === 401 ? 401 : 502;
    log.error('BSale API error', {
      path: req.originalUrl,
      statusCode: status,
      bsaleStatus: error.statusCode,
      message: error.message
    });
    res.status(status).json({
      error: status === 401 ? 'Invalid BSale credentials' : 'BSale API unavailable',
      message: error.message
    });
    return;
  }

  log.error('Unhandled error', {
    path: req.originalUrl,
    error: error instanceof Error ? error.message : String(error)
  });
  res.status(500).json({ error: 'Internal server error' });
}
