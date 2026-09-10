import { createApiHandler } from '../../_lib/middleware/createApiHandler.js';
import { validateQuery } from '../../_lib/middleware/validate.js';
import { getServices } from '../../_lib/services/container.js';
import { paginationQuerySchema } from '../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../_lib/utils/http.js';
import { attachLodgeReviewAggregates, toLodgeListResponse } from '../../_lib/utils/responseMappers.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { limit, offset } = validateQuery(paginationQuerySchema, req);
  const services = getServices();
  const result = await services.catalogService.list('lodge', { limit, offset });
  const mapped = toLodgeListResponse(result);
  res.status(200).json({
    ...mapped,
    items: await attachLodgeReviewAggregates(mapped.items, services.reviewService)
  });
});
