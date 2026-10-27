import { DisabledMailer } from '../disabled-mailer.js';
import { MailDeliveryFailed } from '../smtp-mailer.js';

describe('DisabledMailer', () => {
  it('recusa todo envio com MailDeliveryFailed: a demo fechada não envia e-mail (AD-008)', async () => {
    await expect(
      new DisabledMailer().send({
        to: 'ong@example.com',
        subject: 'Assunto',
        text: 'Texto',
        html: '<p>Texto</p>',
      }),
    ).rejects.toBeInstanceOf(MailDeliveryFailed);
  });
});
