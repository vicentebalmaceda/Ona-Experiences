import { createApiHandler } from '../../../_lib/middleware/createApiHandler.js';
import { validateParams } from '../../../_lib/middleware/validate.js';
import { getServices } from '../../../_lib/services/container.js';
import { productIdParamSchema } from '../../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../../_lib/utils/http.js';
import { attachLodgeReviewAggregates, mapCatalogVariantToLodge } from '../../../_lib/utils/responseMappers.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { productId } = validateParams(productIdParamSchema, req);
  const services = getServices();
  const variant = await services.catalogService.get('lodge', productId);
  const [lodge] = await attachLodgeReviewAggregates(
    [mapCatalogVariantToLodge(variant)],
    services.reviewService
  );
  res.status(200).json(lodge);
});
