import { Module } from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { DisabledMailer } from './adapters/disabled-mailer.js';
import { IMailer, SmtpMailer } from './adapters/smtp-mailer.js';

/** SMTP when configured; without it (locked demo, AD-008) nothing is sent. */
export function createMailer(config: AppConfigService): IMailer {
  return config.smtp ? new SmtpMailer(config.smtp) : new DisabledMailer();
}

@Module({
  providers: [
    { provide: IMailer, useFactory: createMailer, inject: [AppConfigService] },
  ],
  exports: [IMailer],
})
export class MailModule {}
