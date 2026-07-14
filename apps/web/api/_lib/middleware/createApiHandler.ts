import { applyCors } from './cors.js';
import { withErrorHandler, type ApiHandler } from './withErrorHandler.js';
import { withRequestLogging } from './withRequestLogging.js';

/**
 * Standard middleware stack for every serverless route:
 * error handling → request logging → CORS (incl. OPTIONS preflight) → handler.
 */
export function createApiHandler(handler: ApiHandler): ApiHandler {
  return withErrorHandler(
    withRequestLogging(async (req, res) => {
      if (applyCors(req, res)) return;
      await handler(req, res);
    })
  );
}
