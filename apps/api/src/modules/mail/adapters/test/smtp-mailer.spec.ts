import nodemailer, { type Transporter } from 'nodemailer';
import { passwordResetEmail } from '../../templates/password-reset.js';
import { MailDeliveryFailed, SmtpMailer } from '../smtp-mailer.js';

const SMTP = {
  url: 'smtp://localhost:1025',
  from: 'Animal Helper <nao-responda@example.com>',
};
const TO = 'ong@example.com';

function setup() {
  const sendMail = vi.fn().mockResolvedValue({ messageId: '1' });
  const createTransport = vi
    .spyOn(nodemailer, 'createTransport')
    .mockReturnValue({ sendMail } as unknown as Transporter);
  const mailer = new SmtpMailer(SMTP);
  return { mailer, sendMail, createTransport };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SmtpMailer', () => {
  it('cria o transporte a partir de SMTP_URL', () => {
    const { createTransport } = setup();

    expect(createTransport).toHaveBeenCalledWith('smtp://localhost:1025');
  });

  it('envia o e-mail de recuperação com remetente MAIL_FROM, assunto e corpo do template (AUTH-09)', async () => {
    const { mailer, sendMail } = setup();
    const email = passwordResetEmail({
      webUrl: 'http://localhost:3000',
      token: 'tok',
    });

    await mailer.send({ to: TO, ...email });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message).toEqual({
      from: 'Animal Helper <nao-responda@example.com>',
      to: TO,
      subject: 'Recuperação de senha do Animal Helper',
      text: email.text,
      html: email.html,
    });
    expect(message.text).toContain('http://localhost:3000/recuperar-senha/tok');
    expect(message.text).toContain('1 hora');
  });

  it('falha de envio vira MailDeliveryFailed, sem o e-mail do destinatário na mensagem', async () => {
    const { mailer, sendMail } = setup();
    const cause = new Error(`550 mailbox ${TO} unavailable`);
    sendMail.mockRejectedValue(cause);

    const error = await mailer
      .send({ to: TO, subject: 's', text: 't', html: 'h' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MailDeliveryFailed);
    expect((error as MailDeliveryFailed).cause).toBe(cause);
    expect((error as Error).message).toBe('SMTP delivery failed');
    expect((error as Error).message).not.toContain(TO);
  });
});
