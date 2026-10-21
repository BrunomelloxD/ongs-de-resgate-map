import { passwordResetEmail } from '../password-reset.js';

const TOKEN = 'b64url-token_ABC-123';
const LINK = `https://animal-helper.example/recuperar-senha/${TOKEN}`;

describe('passwordResetEmail (AUTH-09)', () => {
  const email = passwordResetEmail({
    webUrl: 'https://animal-helper.example',
    token: TOKEN,
  });

  it('assunto em pt-BR sobre a recuperação de senha', () => {
    expect(email.subject).toBe('Recuperação de senha do Animal Helper');
  });

  it('texto com o link de uso único e a validade de 1 hora', () => {
    expect(email.text).toContain(LINK);
    expect(email.text).toContain(
      'O link vale por 1 hora e só pode ser usado uma vez.',
    );
  });

  it('HTML com o mesmo link clicável e a validade de 1 hora', () => {
    expect(email.html).toContain(`<a href="${LINK}">${LINK}</a>`);
    expect(email.html).toContain(
      'O link vale por 1 hora e só pode ser usado uma vez.',
    );
  });

  it('WEB_URL com barra no fim não gera barra dupla no link', () => {
    const { text } = passwordResetEmail({
      webUrl: 'https://animal-helper.example/',
      token: TOKEN,
    });

    expect(text).toContain(LINK);
  });
});
