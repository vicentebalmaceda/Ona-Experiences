import type { ContactMessage, QuoteNotification, ReviewSubmittedEmail } from './types.js';

/**
 * Sample payloads for the admin "Enviar prueba" button. They render the real
 * Resend templates with obviously fake data so recipients can tell a test
 * from a real notification.
 */

export const sampleContact: ContactMessage = {
  name: 'Ana Pérez (prueba)',
  email: 'ana.prueba@example.com',
  subject: 'Consulta de prueba desde el admin',
  message: 'Este es un correo de prueba enviado desde Configuración → Correos. Puedes ignorarlo.'
};

/** A function so the emission date is the moment of the test, not of the cold start. */
export function sampleQuote(now = new Date()): QuoteNotification {
  return {
    documentId: 0,
    documentNumber: 0,
    salesId: 'ONA-PRUEBA',
    emissionDate: Math.floor(now.getTime() / 1000),
    totalAmount: 119000,
    netAmount: 100000,
    taxAmount: 19000,
    urlPdf: null,
    urlPublicView: null,
    customer: { firstName: 'Cliente', lastName: 'de prueba', email: 'cliente.prueba@example.com' },
    items: [{ description: 'Estadía de prueba', quantity: 1, note: 'Correo de prueba enviado desde el admin.' }]
  };
}

export const sampleReview: ReviewSubmittedEmail = {
  customerEmail: 'cliente.prueba@example.com',
  firstName: 'Cliente',
  lastName: 'de prueba',
  productName: 'Lodge de prueba',
  catalogType: 'lodge',
  rating: 5,
  comment: 'Reseña de prueba enviada desde Configuración → Correos.',
  reviewId: '00000000-0000-0000-0000-000000000000'
};
