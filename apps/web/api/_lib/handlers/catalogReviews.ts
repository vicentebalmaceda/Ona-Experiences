import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import type { CatalogType } from '../types/catalog.js';
import { productIdParamSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

export function createCatalogReviewsHandler(catalogType: CatalogType) {
  return createApiHandler(async (req, res) => {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET']);
      return;
    }

    const { productId } = validateParams(productIdParamSchema, req);
    const view = await getServices().reviewService.listVisibleForProduct(catalogType, productId);
    res.status(200).json(view);
  });
}

export const lodgeReviewsHandler = createCatalogReviewsHandler('lodge');
export const guideReviewsHandler = createCatalogReviewsHandler('guide');
