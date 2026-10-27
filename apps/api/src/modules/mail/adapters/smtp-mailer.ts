import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailContent } from '../templates/password-reset.js';

export interface MailMessage extends EmailContent {
  to: string;
}

/** The message carries no recipient, so it is safe to log (the cause may not be). */
export class MailDeliveryFailed extends Error {
  constructor(options: { cause: unknown }) {
    super('SMTP delivery failed', options);
    this.name = 'MailDeliveryFailed';
  }
}

/** Abstract class (not an interface) so it works as a DI token. */
export abstract class IMailer {
  /** Rejects with MailDeliveryFailed; the caller decides what to do. */
  abstract send(message: MailMessage): Promise<void>;
}

/** SMTP_URL and MAIL_FROM. */
export interface SmtpSettings {
  url: string;
  from: string;
}

/** Mailpit in dev, a transactional provider in production: only SMTP_URL changes. */
export class SmtpMailer extends IMailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(smtp: SmtpSettings) {
    super();
    this.transport = nodemailer.createTransport(smtp.url);
    this.from = smtp.from;
  }

  async send({ to, subject, text, html }: MailMessage): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
    } catch (cause) {
      throw new MailDeliveryFailed({ cause });
    }
  }
}
