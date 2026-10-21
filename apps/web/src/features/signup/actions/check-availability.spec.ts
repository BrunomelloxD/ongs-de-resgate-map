import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { checkCnpj, checkEmail } from './check-availability';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.7' }),
}));

const CNPJ_URL = `${TEST_API_URL}/api/v1/ngos/validations/cnpj`;
const EMAIL_URL = `${TEST_API_URL}/api/v1/ngos/validations/email`;

function apiAnswers(url: string, response: () => Response) {
  const calls: { body: unknown; ip: string | null }[] = [];
  server.use(
    http.post(url, async ({ request }) => {
      calls.push({
        body: await request.json(),
        ip: request.headers.get('x-client-ip'),
      });
      return response();
    }),
  );
  return calls;
}

const tooMany = () =>
  HttpResponse.json({ message: 'Too Many Requests' }, { status: 429 });

describe('checkCnpj', () => {
  it('disponível: envia o CNPJ normalizado com o IP do visitante', async () => {
    const calls = apiAnswers(CNPJ_URL, () =>
      HttpResponse.json({ available: true }),
    );

    await expect(checkCnpj('12.abc.345/01de-35')).resolves.toEqual({
      status: 'available',
    });
    expect(calls).toEqual([
      { body: { cnpj: '12ABC34501DE35' }, ip: '198.51.100.7' },
    ]);
  });

  it('SIGN-05: em uso devolve a mensagem do spec', async () => {
    apiAnswers(CNPJ_URL, () => HttpResponse.json({ available: false }));

    await expect(checkCnpj('11.222.333/0001-81')).resolves.toEqual({
      status: 'taken',
      error:
        'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.',
    });
  });

  it('429 do throttle devolve o aviso, sem bloquear', async () => {
    apiAnswers(CNPJ_URL, tooMany);

    await expect(checkCnpj('11.222.333/0001-81')).resolves.toEqual({
      status: 'unchecked',
      error:
        'Não conseguimos conferir o CNPJ agora. Ele será conferido de novo ao criar a conta.',
    });
  });

  it('api fora do ar devolve o mesmo aviso', async () => {
    apiAnswers(CNPJ_URL, () => new HttpResponse(null, { status: 503 }));

    await expect(checkCnpj('11.222.333/0001-81')).resolves.toMatchObject({
      status: 'unchecked',
    });
  });

  it.each([
    ['CNPJ inválido, sem chamar a api', '11.222.333/0001-82', 0],
    ['400 da api', '11.222.333/0001-81', 1],
  ])('SIGN-04: %s devolve a mensagem do spec', async (_case, cnpj, count) => {
    const calls = apiAnswers(CNPJ_URL, () =>
      HttpResponse.json({ message: ['cnpj inválido'] }, { status: 400 }),
    );

    await expect(checkCnpj(cnpj)).resolves.toEqual({
      status: 'invalid',
      error:
        'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.',
    });
    expect(calls).toHaveLength(count);
  });
});

describe('checkEmail', () => {
  it('disponível: envia o e-mail sem os espaços das pontas, com o IP do visitante', async () => {
    const calls = apiAnswers(EMAIL_URL, () =>
      HttpResponse.json({ available: true }),
    );

    await expect(checkEmail(' contato@patas.org ')).resolves.toEqual({
      status: 'available',
    });
    expect(calls).toEqual([
      { body: { email: 'contato@patas.org' }, ip: '198.51.100.7' },
    ]);
  });

  it('SIGN-12: em uso devolve "Este e-mail já tem cadastro."', async () => {
    apiAnswers(EMAIL_URL, () => HttpResponse.json({ available: false }));

    await expect(checkEmail('contato@patas.org')).resolves.toEqual({
      status: 'taken',
      error: 'Este e-mail já tem cadastro.',
    });
  });

  it('429 do throttle devolve o aviso, sem bloquear', async () => {
    apiAnswers(EMAIL_URL, tooMany);

    await expect(checkEmail('contato@patas.org')).resolves.toEqual({
      status: 'unchecked',
      error:
        'Não conseguimos conferir o e-mail agora. Ele será conferido de novo ao criar a conta.',
    });
  });

  it.each([
    ['e-mail inválido, sem chamar a api', 'contato@', 0],
    ['400 da api', 'contato@patas.org', 1],
  ])('SIGN-11: %s devolve o erro do campo', async (_case, email, count) => {
    const calls = apiAnswers(EMAIL_URL, () =>
      HttpResponse.json(
        { message: ['email must be an email'] },
        { status: 400 },
      ),
    );

    await expect(checkEmail(email)).resolves.toEqual({
      status: 'invalid',
      error: 'Informe um e-mail válido, como nome@ong.org.',
    });
    expect(calls).toHaveLength(count);
  });
});
