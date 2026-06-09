import type { Request, Response, NextFunction } from 'express';
import { GetCatalogVariant } from '../../../application/use-cases/GetCatalogVariant.js';
import { ListCatalogVariants } from '../../../application/use-cases/ListCatalogVariants.js';
import { createLogger } from '../../../shared/logger.js';
import type { PaginationQuery } from '../dto/paginationQuerySchema.js';
import type { ProductIdParams } from '../dto/productIdParamSchema.js';
import { toGuideListResponse, toGuideResponse } from '../dto/guideResponseMapper.js';
import { toLodgeListResponse, toLodgeResponse } from '../dto/lodgeResponseMapper.js';

const log = createLogger('catalog');

type ValidatedRequest = Request & { validatedQuery: PaginationQuery };
type ValidatedParamsRequest = Request & { validatedParams: ProductIdParams };

export class CatalogController {
  constructor(
    private readonly listCatalogVariants: ListCatalogVariants,
    private readonly getCatalogVariant: GetCatalogVariant
  ) {}

  listLodges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset } = (req as ValidatedRequest).validatedQuery;
      log.debug('List lodges handler', { limit, offset });
      const result = await this.listCatalogVariants.execute({ limit, offset, type: 'lodge' });
      res.json(toLodgeListResponse(result));
    } catch (error) {
      next(error);
    }
  };

  listGuides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset } = (req as ValidatedRequest).validatedQuery;
      log.debug('List guides handler', { limit, offset });
      const result = await this.listCatalogVariants.execute({ limit, offset, type: 'guide' });
      res.json(toGuideListResponse(result));
    } catch (error) {
      next(error);
    }
  };

  getLodge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = (req as ValidatedParamsRequest).validatedParams;
      log.debug('Get lodge handler', { productId });
      const variant = await this.getCatalogVariant.execute({ productId, type: 'lodge' });
      res.json(toLodgeResponse(variant));
    } catch (error) {
      next(error);
    }
  };

  getGuide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = (req as ValidatedParamsRequest).validatedParams;
      log.debug('Get guide handler', { productId });
      const variant = await this.getCatalogVariant.execute({ productId, type: 'guide' });
      res.json(toGuideResponse(variant));
    } catch (error) {
      next(error);
    }
  };
}
