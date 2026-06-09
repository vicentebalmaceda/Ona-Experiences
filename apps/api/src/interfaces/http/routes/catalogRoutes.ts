import { Router } from 'express';
import type { CatalogController } from '../controllers/CatalogController.js';
import { paginationQuerySchema } from '../dto/paginationQuerySchema.js';
import { productIdParamSchema } from '../dto/productIdParamSchema.js';
import { validateParams } from '../middleware/validateParams.js';
import { validateQuery } from '../middleware/validateQuery.js';

export function createCatalogRoutes(controller: CatalogController): Router {
  const router = Router();
  router.get('/lodges', validateQuery(paginationQuerySchema), controller.listLodges);
  router.get('/lodges/:productId', validateParams(productIdParamSchema), controller.getLodge);
  router.get('/guides', validateQuery(paginationQuerySchema), controller.listGuides);
  router.get('/guides/:productId', validateParams(productIdParamSchema), controller.getGuide);
  return router;
}
