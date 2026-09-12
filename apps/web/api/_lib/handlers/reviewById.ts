import { getEnv } from '../config/env.js';
import { createApiHandler } from '../middleware/createApiHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { hideReviewSchema, reviewIdParamSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

export const reviewByIdHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'PATCH') {
    methodNotAllowed(res, ['PATCH']);
    return;
  }

  requireAdmin(req, getEnv().ADMIN_API_SECRET);
  const { reviewId } = validateParams(reviewIdParamSchema, req);
  const { hidden } = validateBody(hideReviewSchema, req);
  await getServices().reviewService.setReviewHidden(reviewId, hidden);
  res.status(200).json({ ok: true, reviewId, hidden });
});
