import { getEnv } from '../config/env.js';
import { createApiHandler } from '../middleware/createApiHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateBody } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { createReviewInviteSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

export const reviewInvitesHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  requireAdmin(req, getEnv().ADMIN_API_SECRET);
  const body = validateBody(createReviewInviteSchema, req);
  const result = await getServices().reviewService.createInvite(body);
  res.status(201).json(result);
});
