import { applyCors } from './cors';
import { withErrorHandler, type ApiHandler } from './withErrorHandler';
import { withRequestLogging } from './withRequestLogging';

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
