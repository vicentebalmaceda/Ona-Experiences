import { getEnv } from '../../_lib/config/env.js';
import { createApiHandler } from '../../_lib/middleware/createApiHandler.js';
import { requireAdmin } from '../../_lib/middleware/requireAdmin.js';
import { validateBody, validateParams } from '../../_lib/middleware/validate.js';
import { getServices } from '../../_lib/services/container.js';
import { hideReviewSchema, reviewIdParamSchema } from '../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../_lib/utils/http.js';

export default createApiHandler(async (req, res) => {
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
