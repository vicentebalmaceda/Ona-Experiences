import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateBody } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { submitReviewSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';
import { triggerCoalescedRebuild } from '../utils/deployHook.js';

export const reviewsHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = validateBody(submitReviewSchema, req);
  const result = await getServices().reviewService.submitReview(
    body.token,
    body.rating,
    body.comment
  );
  // The prerendered detail page shows visible reviews and their aggregateRating.
  await triggerCoalescedRebuild('review submitted');
  res.status(201).json(result);
});
