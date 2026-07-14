import { createApiHandler } from '../../../middleware/createApiHandler';
import { validateQuery } from '../../../middleware/validate';
import { getServices } from '../../../services/container';
import { paginationQuerySchema } from '../../../types/schemas';
import { methodNotAllowed } from '../../../utils/http';
import { toLodgeListResponse } from '../../../utils/responseMappers';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { limit, offset } = validateQuery(paginationQuerySchema, req);
  const result = await getServices().catalogService.list('lodge', { limit, offset });
  res.status(200).json(toLodgeListResponse(result));
});
