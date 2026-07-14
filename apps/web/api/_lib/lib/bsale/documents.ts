import type { Env } from '../../config/env.js';
import type { BsaleDocument } from '../../types/bsale.js';
import type { CreateQuoteParams, QuoteSale } from '../../types/sales.js';
import { createLogger } from '../../utils/logger.js';
import type { BsaleClient } from './client.js';

const log = createLogger('bsale-sales');

function buildLineComment(params: CreateQuoteParams): string {
  return `\nCotización para ${params.variant.productName}\n Reserva: ${params.reservationDate} al ${params.reservationEndDate}.\n Detalles:${params.notes}`;
}

export class BsaleSalesRepository {
  constructor(
    private readonly client: BsaleClient,
    private readonly env: Env
  ) {}

  async createQuote(params: CreateQuoteParams): Promise<QuoteSale> {
    const payload = {
      documentTypeId: this.env.BSALE_QUOTE_DOCUMENT_TYPE_ID,
      officeId: this.env.BSALE_OFFICE_ID,
      priceListId: this.env.BSALE_PRICE_LIST_ID,
      emissionDate: params.emissionDate,
      expirationDate: params.expirationDate,
      declareSii: 0,
      salesId: params.salesId,
      clientId: params.clientId,
      sendEmail: 1,
      details: [
        {
          variantId: params.variant.id,
          netUnitValue: params.pricing.netUnitValue,
          quantity: params.quantity,
          taxId: params.pricing.taxId,
          comment: buildLineComment(params)
        }
      ]
    };

    log.debug('Creating BSale cotización', {
      salesId: params.salesId,
      productId: params.variant.productId,
      variantId: params.variant.id,
      clientId: params.clientId,
      reservationDate: params.reservationDate,
      reservationEndDate: params.reservationEndDate
    });

    const document = await this.client.post<BsaleDocument>('/documents.json', payload);

    log.info('BSale cotización created', {
      salesId: params.salesId,
      documentId: document.id,
      documentNumber: document.number
    });

    return {
      salesId: params.salesId,
      serviceType: params.serviceType,
      productId: params.variant.productId,
      variantId: params.variant.id,
      productName: params.variant.productName,
      bsaleClientId: params.clientId,
      bsaleDocumentId: document.id,
      documentNumber: document.number,
      totalAmount: document.totalAmount,
      netAmount: document.netAmount,
      taxAmount: document.taxAmount,
      urlPdf: document.urlPdf ?? null,
      urlPublicView: document.urlPublicView ?? null
    };
  }
}
