import type { AppConfigService } from '@/common/config/app-config.service.js';
import { DisabledMailer } from '../adapters/disabled-mailer.js';
import { SmtpMailer } from '../adapters/smtp-mailer.js';
import { createMailer } from '../mail.module.js';

describe('createMailer', () => {
  it('usa o SMTP quando SMTP_URL e MAIL_FROM existem', () => {
    const config = {
      smtp: { url: 'smtp://localhost:1025', from: 'a@example.com' },
    } as AppConfigService;

    expect(createMailer(config)).toBeInstanceOf(SmtpMailer);
  });

  it('usa o DisabledMailer sem SMTP: a api sobe sem SMTP_URL (DEP-14)', () => {
    expect(createMailer({ smtp: null } as AppConfigService)).toBeInstanceOf(
      DisabledMailer,
    );
  });
});
