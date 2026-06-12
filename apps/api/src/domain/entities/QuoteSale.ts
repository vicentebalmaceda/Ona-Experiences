export interface QuoteSale {
  salesId: string;
  serviceType: 'lodge' | 'guide';
  productId: number;
  variantId: number;
  productName: string;
  bsaleClientId: number;
  bsaleDocumentId: number;
  documentNumber: number;
  totalAmount: number;
  netAmount: number;
  taxAmount: number;
  urlPdf: string | null;
  urlPublicView: string | null;
}

export interface VariantPricing {
  variantId: number;
  netUnitValue: number;
  taxId: string;
}
