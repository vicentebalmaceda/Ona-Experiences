import { createApiHandler } from '../../_lib/middleware/createApiHandler.js';
import { validateParams } from '../../_lib/middleware/validate.js';
import { getServices } from '../../_lib/services/container.js';
import { reviewTokenParamSchema } from '../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../_lib/utils/http.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { token } = validateParams(reviewTokenParamSchema, req);
  const preview = await getServices().reviewService.previewInvite(token);
  res.status(200).json(preview);
});
