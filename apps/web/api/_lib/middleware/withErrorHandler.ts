import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BsaleApiError, DomainError, ValidationError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('http');

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

/**
 * Reproduces the Express errorHandler contract:
 * - ValidationError → 400 with the original Zod payload
 * - DomainError → its statusCode with { error, code }
 * - BsaleApiError 401 → 401 "Invalid BSale credentials"; anything else → 502
 * - Unknown → 500 { error: "Internal server error" }
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const path = req.url ?? '';

      if (error instanceof ValidationError) {
        log.warn('Validation error', { path, details: error.payload.details });
        res.status(400).json(error.payload);
        return;
      }

      if (error instanceof DomainError) {
        log.warn('Domain error', {
          path,
          statusCode: error.statusCode,
          message: error.message,
          code: error.code
        });
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }

      if (error instanceof BsaleApiError) {
        // 4xx (other than auth) means BSale validated and rejected our payload:
        // surface its message as 422 so the caller can act on it instead of
        // reading a generic "unavailable".
        const rejected = error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401;
        const status = error.statusCode === 401 ? 401 : rejected ? 422 : 502;
        log.error('BSale API error', {
          path,
          statusCode: status,
          bsaleStatus: error.statusCode,
          message: error.message,
          body: error.body
        });
        res.status(status).json(
          rejected
            ? { error: error.message, code: 'BSALE_REJECTED', bsaleStatus: error.statusCode }
            : {
                error: status === 401 ? 'Invalid BSale credentials' : 'BSale API unavailable',
                message: error.message
              }
        );
        return;
      }

      log.error('Unhandled error', {
        path,
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
