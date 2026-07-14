import { createApiHandler } from '../../_lib/middleware/createApiHandler.js';
import { validateQuery } from '../../_lib/middleware/validate.js';
import { getServices } from '../../_lib/services/container.js';
import { paginationQuerySchema } from '../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../_lib/utils/http.js';
import { toLodgeListResponse } from '../../_lib/utils/responseMappers.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { limit, offset } = validateQuery(paginationQuerySchema, req);
  const result = await getServices().catalogService.list('lodge', { limit, offset });
  res.status(200).json(toLodgeListResponse(result));
});
