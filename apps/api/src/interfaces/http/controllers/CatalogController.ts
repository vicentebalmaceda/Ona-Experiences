import type { Request, Response, NextFunction } from 'express';
import { ListCatalogVariants } from '../../../application/use-cases/ListCatalogVariants.js';
import { createLogger } from '../../../shared/logger.js';
import type { PaginationQuery } from '../dto/paginationQuerySchema.js';
import { toGuideListResponse } from '../dto/guideResponseMapper.js';
import { toLodgeListResponse } from '../dto/lodgeResponseMapper.js';

const log = createLogger('catalog');

type ValidatedRequest = Request & { validatedQuery: PaginationQuery };

export class CatalogController {
  constructor(private readonly listCatalogVariants: ListCatalogVariants) {}

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
}
