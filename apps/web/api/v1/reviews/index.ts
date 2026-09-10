import { createApiHandler } from '../../_lib/middleware/createApiHandler.js';
import { validateBody } from '../../_lib/middleware/validate.js';
import { getServices } from '../../_lib/services/container.js';
import { submitReviewSchema } from '../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../_lib/utils/http.js';

export default createApiHandler(async (req, res) => {
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
