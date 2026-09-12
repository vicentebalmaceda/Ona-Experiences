import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { reviewTokenParamSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

export const reviewInviteByTokenHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { token } = validateParams(reviewTokenParamSchema, req);
  const preview = await getServices().reviewService.previewInvite(token);
  res.status(200).json(preview);
});
