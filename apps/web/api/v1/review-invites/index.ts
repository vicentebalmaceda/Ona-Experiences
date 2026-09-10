import { getEnv } from '../../_lib/config/env.js';
import { createApiHandler } from '../../_lib/middleware/createApiHandler.js';
import { requireAdmin } from '../../_lib/middleware/requireAdmin.js';
import { validateBody } from '../../_lib/middleware/validate.js';
import { getServices } from '../../_lib/services/container.js';
import { createReviewInviteSchema } from '../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../_lib/utils/http.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  requireAdmin(req, getEnv().ADMIN_API_SECRET);
  const body = validateBody(createReviewInviteSchema, req);
  const result = await getServices().reviewService.createInvite(body);
  res.status(201).json(result);
});
