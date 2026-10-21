import { Module } from '@nestjs/common';
import { IMailer, SmtpMailer } from './adapters/smtp-mailer.js';

@Module({
  providers: [{ provide: IMailer, useClass: SmtpMailer }],
  exports: [IMailer],
})
export class MailModule {}
