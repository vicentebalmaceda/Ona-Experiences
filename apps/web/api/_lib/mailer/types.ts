export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface QuoteLineItem {
  description?: string;
  quantity?: number;
  netUnitValue?: number;
  totalAmount?: number;
  /** Line note/comment from BSale (reservation dates, product name, details). */
  note?: string | null;
}

export interface QuoteCustomer {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  code?: string;
}

export interface QuoteNotification {
  documentId: number;
  documentNumber?: number;
  salesId?: string;
  emissionDate?: number;
  totalAmount?: number;
  netAmount?: number;
  taxAmount?: number;
  urlPdf?: string | null;
  urlPublicView?: string | null;
  customer?: QuoteCustomer;
  items?: QuoteLineItem[];
  /** Reserved for future PDF / file attachments. */
  attachments?: EmailAttachment[];
}

export interface Mailer {
  sendContactMessage(data: ContactMessage): Promise<void>;
  sendQuoteNotification(data: QuoteNotification): Promise<void>;
}
