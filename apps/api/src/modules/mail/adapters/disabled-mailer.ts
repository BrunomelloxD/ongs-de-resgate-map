import {
  IMailer,
  MailDeliveryFailed,
  type MailMessage,
} from './smtp-mailer.js';

/** Locked demo (AD-008): no SMTP, and the routes that send e-mail answer 403. */
export class DisabledMailer extends IMailer {
  send(_message: MailMessage): Promise<void> {
    return Promise.reject(
      new MailDeliveryFailed({ cause: new Error('Mail is disabled') }),
    );
  }
}
