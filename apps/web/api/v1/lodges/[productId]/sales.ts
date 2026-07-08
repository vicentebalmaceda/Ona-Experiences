import { createApiHandler } from '../../../../middleware/createApiHandler';
import { validateBody, validateParams } from '../../../../middleware/validate';
import { getServices } from '../../../../services/container';
import { productIdParamSchema, saleRequestSchema } from '../../../../types/schemas';
import { methodNotAllowed } from '../../../../utils/http';
import { toSaleResponse } from '../../../../utils/responseMappers';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const { productId } = validateParams(productIdParamSchema, req);
  const body = validateBody(saleRequestSchema, req);

  const quote = await getServices().salesService.createQuote({
    productId,
    type: 'lodge',
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
