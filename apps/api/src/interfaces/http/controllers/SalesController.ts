import type { Request, Response, NextFunction } from 'express';
import { CreateQuoteSale } from '../../../application/use-cases/CreateQuoteSale.js';
import { createLogger } from '../../../shared/logger.js';
import type { ProductIdParams } from '../dto/productIdParamSchema.js';
import type { SaleRequestBody } from '../dto/saleRequestSchema.js';
import { toSaleResponse } from '../dto/saleResponseMapper.js';

const log = createLogger('sales');

type ValidatedParamsRequest = Request & { validatedParams: ProductIdParams };
type ValidatedBodyRequest = Request & { validatedBody: SaleRequestBody };

export class SalesController {
  constructor(private readonly createQuoteSale: CreateQuoteSale) {}

  createLodgeSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = (req as ValidatedParamsRequest).validatedParams;
      const body = (req as ValidatedBodyRequest).validatedBody;
      log.debug('Create lodge sale handler', { productId });

      const quote = await this.createQuoteSale.execute({
        productId,
        type: 'lodge',
        customer: body.customer,
        quantity: body.quantity,
        reservationDate: body.reservationDate,
        notes: body.notes,
        emissionDate: body.emissionDate,
        expirationDate: body.expirationDate
      });

      res.status(201).json(toSaleResponse(quote));
    } catch (error) {
      next(error);
    }
  };

  createGuideSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = (req as ValidatedParamsRequest).validatedParams;
      const body = (req as ValidatedBodyRequest).validatedBody;
      log.debug('Create guide sale handler', { productId });

      const quote = await this.createQuoteSale.execute({
        productId,
        type: 'guide',
        customer: body.customer,
        quantity: body.quantity,
        reservationDate: body.reservationDate,
        notes: body.notes,
        emissionDate: body.emissionDate,
        expirationDate: body.expirationDate
      });

      res.status(201).json(toSaleResponse(quote));
    } catch (error) {
      next(error);
    }
  };
}
