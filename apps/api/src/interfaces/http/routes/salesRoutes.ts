import { Router } from 'express';
import type { SalesController } from '../controllers/SalesController.js';
import { productIdParamSchema } from '../dto/productIdParamSchema.js';
import { saleRequestSchema } from '../dto/saleRequestSchema.js';
import { validateBody } from '../middleware/validateBody.js';
import { validateParams } from '../middleware/validateParams.js';

export function createSalesRoutes(controller: SalesController): Router {
  const router = Router();
  router.post(
    '/lodges/:productId/sales',
    validateParams(productIdParamSchema),
    validateBody(saleRequestSchema),
    controller.createLodgeSale
  );
  router.post(
    '/guides/:productId/sales',
    validateParams(productIdParamSchema),
    validateBody(saleRequestSchema),
    controller.createGuideSale
  );
  return router;
}
