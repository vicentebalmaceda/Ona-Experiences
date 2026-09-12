import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import type { CatalogType } from '../types/catalog.js';
import { productIdParamSchema, saleRequestSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';
import { toSaleResponse } from '../utils/responseMappers.js';

export function createCatalogSalesHandler(catalogType: CatalogType) {
  return createApiHandler(async (req, res) => {
    if (req.method !== 'POST') {
      methodNotAllowed(res, ['POST']);
      return;
    }

    const { productId } = validateParams(productIdParamSchema, req);
    const body = validateBody(saleRequestSchema, req);

    const quote = await getServices().salesService.createQuote({
      productId,
      type: catalogType,
      customer: body.customer,
      quantity: body.quantity,
      reservationDate: body.reservationDate,
      reservationEndDate: body.reservationEndDate,
      notes: body.notes,
      emissionDate: body.emissionDate,
      expirationDate: body.expirationDate
    });

    res.status(201).json(toSaleResponse(quote));
  });
}

export const lodgeSalesHandler = createCatalogSalesHandler('lodge');
export const guideSalesHandler = createCatalogSalesHandler('guide');
