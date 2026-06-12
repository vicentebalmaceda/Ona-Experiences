import type { QuoteSale } from '../../../domain/entities/QuoteSale.js';

export function toSaleResponse(quote: QuoteSale) {
  return {
    salesId: quote.salesId,
    serviceType: quote.serviceType,
    productId: quote.productId,
    variantId: quote.variantId,
    productName: quote.productName,
    bsaleClientId: quote.bsaleClientId,
    bsaleDocumentId: quote.bsaleDocumentId,
    documentNumber: quote.documentNumber,
    totalAmount: quote.totalAmount,
    netAmount: quote.netAmount,
    taxAmount: quote.taxAmount,
    urlPdf: quote.urlPdf,
    urlPublicView: quote.urlPublicView
  };
}
