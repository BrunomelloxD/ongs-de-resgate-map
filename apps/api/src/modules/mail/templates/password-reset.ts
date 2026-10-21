export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const VALIDITY = 'O link vale por 1 hora e só pode ser usado uma vez.';

/** AUTH-09: single-use link, valid for 1 hour (the token is base64url, safe in HTML). */
export function passwordResetEmail({
  webUrl,
  token,
}: {
  webUrl: string;
  token: string;
}): EmailContent {
  const link = `${webUrl.replace(/\/$/, '')}/recuperar-senha/${token}`;
  const intro =
    'Recebemos um pedido para trocar a senha da sua ONG no Animal Helper.';
  const ignore =
    'Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.';

  return {
    subject: 'Recuperação de senha do Animal Helper',
    text: [
      'Olá,',
      intro,
      `Para criar uma senha nova, abra: ${link}`,
      VALIDITY,
      ignore,
    ].join('\n\n'),
    html: [
      '<p>Olá,</p>',
      `<p>${intro}</p>`,
      `<p>Para criar uma senha nova, abra: <a href="${link}">${link}</a></p>`,
      `<p>${VALIDITY}</p>`,
      `<p>${ignore}</p>`,
    ].join('\n'),
  };
}
