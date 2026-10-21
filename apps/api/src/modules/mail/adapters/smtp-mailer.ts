import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '@/common/config/app-config.service.js';
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

/** Mailpit in dev, a transactional provider in production: only SMTP_URL changes. */
@Injectable()
export class SmtpMailer extends IMailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: AppConfigService) {
    super();
    this.transport = nodemailer.createTransport(config.smtp.url);
    this.from = config.smtp.from;
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
