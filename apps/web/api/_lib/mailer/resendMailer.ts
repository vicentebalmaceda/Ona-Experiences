import { Resend } from 'resend';
import type { Env } from '../config/env.js';
import { DomainError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';
import {
  contactEmailSubject,
  contactTemplateVariables,
  quoteEmailSubject,
  quoteTemplateVariables,
  reviewAdminEmailSubject,
  reviewAdminTemplateVariables,
  reviewInviteEmailSubject,
  reviewInviteTemplateVariables,
  reviewThanksEmailSubject,
  reviewThanksTemplateVariables
} from './templateVariables.js';
import type {
  ContactMessage,
  EmailAttachment,
  Mailer,
  QuoteNotification,
  ReviewInviteEmail,
  ReviewSubmittedEmail
} from './types.js';

const log = createLogger('mailer');

function toResendAttachments(attachments: EmailAttachment[] | undefined) {
  if (!attachments?.length) return undefined;
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    content_type: attachment.contentType
  }));
}

export class ResendMailer implements Mailer {
  private readonly resend: Resend;

  constructor(private readonly env: Env, resendClient?: Resend) {
    this.resend = resendClient ?? new Resend(env.RESEND_API_KEY);
  }

  async sendContactMessage(data: ContactMessage): Promise<void> {
    const subject = contactEmailSubject(data);
    const variables = contactTemplateVariables(data);

    log.info('Sending contact message email', { subject });

    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      to: [this.env.ADMIN_EMAIL],
      replyTo: data.email,
      subject,
      template: {
        id: this.env.RESEND_CONTACT_TEMPLATE_ID,
        variables
      }
    });

    if (error) {
      log.error('Failed to send contact message email', { message: error.message });
      throw new DomainError('Failed to send contact email', 500, 'MAILER_ERROR');
    }
  }

  async sendQuoteNotification(data: QuoteNotification): Promise<void> {
    const subject = quoteEmailSubject(data);
    const variables = quoteTemplateVariables(data);
    const replyTo = data.customer?.email?.trim() || undefined;
    // Version the key when the email payload shape changes so Resend allows a
    // new send (same key + different body returns 409 for 24h).
    const idempotencyKey = `quote-notification:v6:${data.documentId}`;

    log.info('Sending quote notification email', {
      documentId: data.documentId,
      documentNumber: data.documentNumber
    });

    const { error } = await this.resend.emails.send(
      {
        from: this.env.MAIL_FROM,
        to: [this.env.ADMIN_EMAIL],
        ...(replyTo ? { replyTo } : {}),
        subject,
        template: {
          id: this.env.RESEND_QUOTE_TEMPLATE_ID,
          variables
        },
        attachments: toResendAttachments(data.attachments)
      },
      { idempotencyKey }
    );

    if (error) {
      log.error('Failed to send quote notification email', {
        documentId: data.documentId,
        message: error.message
      });
      throw new DomainError('Failed to send quote notification', 500, 'MAILER_ERROR');
    }
  }

  async sendReviewInvite(data: ReviewInviteEmail): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      to: [data.to],
      subject: reviewInviteEmailSubject(data),
      template: {
        id: this.env.RESEND_REVIEW_INVITE_TEMPLATE_ID,
        variables: reviewInviteTemplateVariables(data)
      }
    });

    if (error) {
      log.error('Failed to send review invite email', { message: error.message });
      throw new DomainError('Failed to send review invite', 500, 'MAILER_ERROR');
    }
  }

  async sendReviewThankYou(data: ReviewSubmittedEmail): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      to: [data.customerEmail],
      subject: reviewThanksEmailSubject(data),
      template: {
        id: this.env.RESEND_REVIEW_THANKS_TEMPLATE_ID,
        variables: reviewThanksTemplateVariables(data)
      }
    });

    if (error) {
      log.error('Failed to send review thank-you email', { message: error.message });
      throw new DomainError('Failed to send review thank-you', 500, 'MAILER_ERROR');
    }
  }

  async sendReviewAdminNotification(data: ReviewSubmittedEmail): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      to: [this.env.ADMIN_EMAIL],
      replyTo: data.customerEmail,
      subject: reviewAdminEmailSubject(data),
      template: {
        id: this.env.RESEND_REVIEW_ADMIN_TEMPLATE_ID,
        variables: reviewAdminTemplateVariables(data)
      }
    });

    if (error) {
      log.error('Failed to send review admin email', { message: error.message });
      throw new DomainError('Failed to send review admin notification', 500, 'MAILER_ERROR');
    }
  }
}
