import { createApiHandler } from '../../../../middleware/createApiHandler';
import { validateParams } from '../../../../middleware/validate';
import { getServices } from '../../../../services/container';
import { productIdParamSchema } from '../../../../types/schemas';
import { methodNotAllowed } from '../../../../utils/http';
import { mapCatalogVariantToLodge } from '../../../../utils/responseMappers';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const { productId } = validateParams(productIdParamSchema, req);
  const variant = await getServices().catalogService.get('lodge', productId);
  res.status(200).json(mapCatalogVariantToLodge(variant));
});
