import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateQuery } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import type { CatalogType } from '../types/catalog.js';
import { paginationQuerySchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';
import {
  attachGuideReviewAggregates,
  attachLodgeReviewAggregates,
  toGuideListResponse,
  toLodgeListResponse
} from '../utils/responseMappers.js';

export function createCatalogListHandler(catalogType: CatalogType) {
  return createApiHandler(async (req, res) => {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET']);
      return;
    }

    const { limit, offset } = validateQuery(paginationQuerySchema, req);
    const services = getServices();
    const result = await services.catalogService.list(catalogType, { limit, offset });

    if (catalogType === 'lodge') {
      const mapped = toLodgeListResponse(result);
      res.status(200).json({
        ...mapped,
        items: await attachLodgeReviewAggregates(mapped.items, services.reviewService)
      });
      return;
    }

    const mapped = toGuideListResponse(result);
    res.status(200).json({
      ...mapped,
      items: await attachGuideReviewAggregates(mapped.items, services.reviewService)
    });
  });
}

export const lodgeListHandler = createCatalogListHandler('lodge');
export const guideListHandler = createCatalogListHandler('guide');
