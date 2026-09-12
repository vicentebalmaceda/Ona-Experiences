import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import type { CatalogType } from '../types/catalog.js';
import { productIdParamSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';
import {
  attachGuideReviewAggregates,
  attachLodgeReviewAggregates,
  mapCatalogVariantToGuide,
  mapCatalogVariantToLodge
} from '../utils/responseMappers.js';

export function createCatalogItemHandler(catalogType: CatalogType) {
  return createApiHandler(async (req, res) => {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET']);
      return;
    }

    const { productId } = validateParams(productIdParamSchema, req);
    const services = getServices();
    const variant = await services.catalogService.get(catalogType, productId);

    if (catalogType === 'lodge') {
      const [lodge] = await attachLodgeReviewAggregates(
        [mapCatalogVariantToLodge(variant)],
        services.reviewService
      );
      res.status(200).json(lodge);
      return;
    }

    const [guide] = await attachGuideReviewAggregates(
      [mapCatalogVariantToGuide(variant)],
      services.reviewService
    );
    res.status(200).json(guide);
  });
}

export const lodgeItemHandler = createCatalogItemHandler('lodge');
export const guideItemHandler = createCatalogItemHandler('guide');
