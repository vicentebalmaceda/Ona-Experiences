import type {
  ContactMessage,
  QuoteNotification,
  ReviewInviteEmail,
  ReviewSubmittedEmail
} from './types.js';

/** Resend string variable values are capped at 2000 characters. */
export const RESEND_VAR_MAX_LENGTH = 2000;

export function truncateResendValue(value: string, max = RESEND_VAR_MAX_LENGTH): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function formatUnixDate(unix?: number): string {
  if (unix == null || !Number.isFinite(unix)) return '';
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function customerName(data: QuoteNotification): string {
  const first = data.customer?.firstName?.trim() ?? '';
  const last = data.customer?.lastName?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  return full || 'Cliente';
}

export function contactEmailSubject(data: ContactMessage): string {
  return data.subject;
}

export function contactTemplateVariables(data: ContactMessage): Record<string, string> {
  return {
    CONTACT_NAME: data.name,
    CONTACT_EMAIL: data.email,
    CONTACT_SUBJECT: data.subject,
    CONTACT_MESSAGE: truncateResendValue(data.message)
  };
}

export function quoteEmailSubject(data: QuoteNotification): string {
  const number = data.documentNumber != null ? `#${data.documentNumber}` : `id ${data.documentId}`;
  const fromNote = data.items?.find((item) => item.description)?.description;
  const label = fromNote || customerName(data);
  return `Nueva cotización ${number} — ${label}`;
}

export function formatItemsSummary(data: QuoteNotification): string {
  const items = data.items ?? [];
  if (items.length === 0) {
    return '(sin detalle de ítems)';
  }

  const lines: string[] = [];
  for (const [index, item] of items.entries()) {
    const desc = item.description ?? `Ítem ${index + 1}`;
    const qty = item.quantity != null ? ` (cantidad: ${item.quantity})` : '';
    lines.push(`- ${desc}${qty}`);
    if (item.note?.trim()) {
      lines.push('Detalle:');
      lines.push(item.note.trim());
    }
  }
  return lines.join('\n');
}

/**
 * Keys required by the published Resend `quote-notification` template.
 * Keep in sync with `{{{…}}}` placeholders in that template and RESEND_TEMPLATES.md.
 */
export const QUOTE_TEMPLATE_VARIABLE_KEYS = [
  'DOCUMENT_ID',
  'DOCUMENT_NUMBER',
  'SALES_ID',
  'EMISSION_DATE',
  'CUSTOMER_NAME',
  'CUSTOMER_EMAIL',
  'CUSTOMER_PHONE',
  'CUSTOMER_CODE',
  'URL_PUBLIC_VIEW',
  'URL_PDF',
  'ITEMS_SUMMARY'
] as const;

export type QuoteTemplateVariableKey = (typeof QUOTE_TEMPLATE_VARIABLE_KEYS)[number];

export function quoteTemplateVariables(
  data: QuoteNotification
): Record<QuoteTemplateVariableKey, string> {
  return {
    DOCUMENT_ID: String(data.documentId),
    DOCUMENT_NUMBER: data.documentNumber != null ? String(data.documentNumber) : '',
    SALES_ID: data.salesId ?? '',
    EMISSION_DATE: formatUnixDate(data.emissionDate),
    CUSTOMER_NAME: customerName(data),
    CUSTOMER_EMAIL: data.customer?.email ?? '',
    CUSTOMER_PHONE: data.customer?.phone ?? '',
    CUSTOMER_CODE: data.customer?.code ?? '',
    URL_PUBLIC_VIEW: data.urlPublicView ?? '',
    URL_PDF: data.urlPdf ?? '',
    ITEMS_SUMMARY: truncateResendValue(formatItemsSummary(data))
  };
}

export function reviewInviteEmailSubject(data: ReviewInviteEmail): string {
  return `Cuéntanos tu experiencia en ${data.productName}`;
}

export function reviewInviteTemplateVariables(
  data: ReviewInviteEmail
): Record<string, string> {
  return {
    CUSTOMER_FIRST_NAME: data.firstName,
    PRODUCT_NAME: data.productName,
    REVIEW_URL: data.reviewUrl,
    EXPIRES_ON: data.expiresAt.slice(0, 10)
  };
}

export function reviewThanksEmailSubject(data: ReviewSubmittedEmail): string {
  return `Gracias por tu reseña de ${data.productName}`;
}

export function reviewThanksTemplateVariables(
  data: ReviewSubmittedEmail
): Record<string, string> {
  return {
    CUSTOMER_FIRST_NAME: data.firstName,
    PRODUCT_NAME: data.productName,
    RATING: String(data.rating),
    COMMENT: truncateResendValue(data.comment)
  };
}

export function reviewAdminEmailSubject(data: ReviewSubmittedEmail): string {
  return `Nueva reseña — ${data.productName}`;
}

export function reviewAdminTemplateVariables(
  data: ReviewSubmittedEmail
): Record<string, string> {
  const last = data.lastName.trim();
  const name = `${data.firstName} ${last}`.trim();
  return {
    CUSTOMER_NAME: name || data.firstName,
    CUSTOMER_EMAIL: data.customerEmail,
    PRODUCT_NAME: data.productName,
    CATALOG_TYPE: data.catalogType,
    RATING: String(data.rating),
    COMMENT: truncateResendValue(data.comment),
    REVIEW_ID: data.reviewId
  };
}
