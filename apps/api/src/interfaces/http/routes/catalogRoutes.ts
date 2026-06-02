import { Router } from 'express';
import type { CatalogController } from '../controllers/CatalogController.js';
import { paginationQuerySchema } from '../dto/paginationQuerySchema.js';
import { validateQuery } from '../middleware/validateQuery.js';

export function createCatalogRoutes(controller: CatalogController): Router {
  const router = Router();
  router.get('/lodges', validateQuery(paginationQuerySchema), controller.listLodges);
  router.get('/guides', validateQuery(paginationQuerySchema), controller.listGuides);
  return router;
}
