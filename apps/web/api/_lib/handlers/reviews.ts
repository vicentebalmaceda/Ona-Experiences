import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateBody } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { submitReviewSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

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
  res.status(201).json(result);
});
