import { Resend } from 'resend';
import type { MailRecipients, MailSettingKey } from '../../../shared/siteSettings.js';
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
import { sampleContact, sampleQuote, sampleReview } from './testSamples.js';
import type {
  ContactMessage,
  EmailAttachment,
  Mailer,
  MailRecipientResolver,
  QuoteNotification,
  ReviewInviteEmail,
  ReviewSubmittedEmail,
  TestMailer
} from './types.js';

const log = createLogger('mailer');

/** Default resolver: every internal flow goes to ADMIN_EMAIL, no cc. */
export class EnvMailRecipients implements MailRecipientResolver {
  constructor(private readonly adminEmail: string) {}

  async forFlow(): Promise<MailRecipients> {
    return { to: [this.adminEmail], cc: [] };
  }
}

function recipientFields(recipients: MailRecipients): { to: string[]; cc?: string[] } {
  return recipients.cc.length > 0 ? { to: recipients.to, cc: recipients.cc } : { to: recipients.to };
}

const TEST_SUBJECT_PREFIX = '[Prueba] ';

function toResendAttachments(attachments: EmailAttachment[] | undefined) {
  if (!attachments?.length) return undefined;
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    content_type: attachment.contentType
  }));
}

export class ResendMailer implements Mailer, TestMailer {
  private readonly resend: Resend;
  private readonly recipients: MailRecipientResolver;

  constructor(private readonly env: Env, resendClient?: Resend, recipients?: MailRecipientResolver) {
    this.resend = resendClient ?? new Resend(env.RESEND_API_KEY);
    this.recipients = recipients ?? new EnvMailRecipients(env.ADMIN_EMAIL);
  }

  async sendContactMessage(data: ContactMessage): Promise<void> {
    const subject = contactEmailSubject(data);
    const variables = contactTemplateVariables(data);

    const recipients = await this.recipients.forFlow('mail.contact');

    log.info('Sending contact message email', { subject, to: recipients.to.length });

    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      ...recipientFields(recipients),
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
    const recipients = await this.recipients.forFlow('mail.quote');

    log.info('Sending quote notification email', {
      documentId: data.documentId,
      documentNumber: data.documentNumber,
      to: recipients.to.length
    });

    const { error } = await this.resend.emails.send(
      {
        from: this.env.MAIL_FROM,
        ...recipientFields(recipients),
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
    const recipients = await this.recipients.forFlow('mail.review_admin');
    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      ...recipientFields(recipients),
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

  /**
   * Sends the flow's real Resend template with sample data to the given
   * recipients, so an Admin can confirm addresses before saving them.
   */
  async sendTestEmail(key: MailSettingKey, recipients: MailRecipients): Promise<void> {
    const sample = this.testPayload(key);
    log.info('Sending test email', { key, to: recipients.to.length, cc: recipients.cc.length });

    const { error } = await this.resend.emails.send({
      from: this.env.MAIL_FROM,
      ...recipientFields(recipients),
      subject: TEST_SUBJECT_PREFIX + sample.subject,
      template: sample.template
    });

    if (error) {
      log.error('Failed to send test email', { key, message: error.message });
      throw new DomainError(`No se pudo enviar el correo de prueba: ${error.message}`, 502, 'MAILER_ERROR');
    }
  }

  private testPayload(key: MailSettingKey): { subject: string; template: { id: string; variables: Record<string, string> } } {
    switch (key) {
      case 'mail.contact':
        return {
          subject: contactEmailSubject(sampleContact),
          template: { id: this.env.RESEND_CONTACT_TEMPLATE_ID, variables: contactTemplateVariables(sampleContact) }
        };
      case 'mail.quote': {
        const quote = sampleQuote();
        return {
          subject: quoteEmailSubject(quote),
          template: { id: this.env.RESEND_QUOTE_TEMPLATE_ID, variables: quoteTemplateVariables(quote) }
        };
      }
      case 'mail.review_admin':
        return {
          subject: reviewAdminEmailSubject(sampleReview),
          template: { id: this.env.RESEND_REVIEW_ADMIN_TEMPLATE_ID, variables: reviewAdminTemplateVariables(sampleReview) }
        };
    }
  }
}
