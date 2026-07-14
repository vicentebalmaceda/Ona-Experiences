import { createApiHandler } from '../../../_lib/middleware/createApiHandler.js';
import { validateBody, validateParams } from '../../../_lib/middleware/validate.js';
import { getServices } from '../../../_lib/services/container.js';
import { productIdParamSchema, saleRequestSchema } from '../../../_lib/types/schemas.js';
import { methodNotAllowed } from '../../../_lib/utils/http.js';
import { toSaleResponse } from '../../../_lib/utils/responseMappers.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const { productId } = validateParams(productIdParamSchema, req);
  const body = validateBody(saleRequestSchema, req);

  const quote = await getServices().salesService.createQuote({
    productId,
    type: 'guide',
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
