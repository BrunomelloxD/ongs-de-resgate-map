// @vitest-environment node
// A Server Action runs on Node: jsdom's FormData and File break Node's fetch.
import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import type { CreateAccountPayload } from '../signup.types';
import { makeSignupData } from '../test-fixtures';
import { createAccount } from './create-account';

const store = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.60' }),
}));

const NGOS_URL = `${TEST_API_URL}/api/v1/ngos`;
const REQUEST_ID = '3f0c8a52-6c1e-4f43-9a5e-8d2b1f0e7a11';
const DEMO_07 =
  'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.';
const DEMO_08 =
  'Limite de cadastros desta rede por hoje. Tente de novo amanhã.';

function payload(): CreateAccountPayload {
  const data = makeSignupData();
  return {
    ...data,
    review: { termsAccepted: true, demoAccepted: true },
    signupRequestId: REQUEST_ID,
  };
}

function form(data: unknown = payload(), image?: File) {
  const formData = new FormData();
  formData.set('data', typeof data === 'string' ? data : JSON.stringify(data));
  if (image) formData.set('image', image);
  return formData;
}

function apiAnswers(status: number, body: object) {
  const calls: { request: Request; body: unknown }[] = [];
  server.use(
    http.post(NGOS_URL, async ({ request }) => {
      calls.push({ request, body: await request.clone().json() });
      return HttpResponse.json(body, { status });
    }),
  );
  return calls;
}

const SIGNUP_RESPONSE = {
  token: 'token-novo',
  ngo: { id: 'ngo-1', slug: 'patas' },
};

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

const noUpload = () => vi.fn(async (_fd: FormData) => ({ ok: true }));

beforeEach(() => vi.clearAllMocks());

describe('createAccount', () => {
  it('SIGN-28: 201 grava o cookie da sessão e abre /painel', async () => {
    const calls = apiAnswers(201, SIGNUP_RESPONSE);
    const upload = noUpload();

    const error = await createAccount(form(), upload).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/painel');
    expect(store.set).toHaveBeenCalledWith('ah_session', 'token-novo', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });
    expect(upload).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it('SIGN-28/SIGN-32: envia os dados normalizados, o signupRequestId e o IP do visitante', async () => {
    const calls = apiAnswers(201, SIGNUP_RESPONSE);

    await createAccount(form(), noUpload()).catch(() => undefined);

    expect(calls[0]!.request.headers.get('x-client-ip')).toBe('198.51.100.60');
    expect(calls[0]!.body).toEqual({
      cnpj: '11222333000181',
      legalName: 'Associação Protetora Patas do Bairro',
      description:
        'Resgatamos cães e gatos abandonados na Zona Sul de São Paulo desde 2014.',
      email: 'contato@patasdobairro.org',
      whatsapp: '5511987654321',
      password: 'senha1234',
      cep: '04015012',
      street: 'Rua Joaquim Távora',
      number: '1240',
      complement: null,
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
      lat: -23.5869,
      lng: -46.6347,
      locationConfirmedAt: '2026-10-20T12:00:00.000Z',
      openingHours: [
        { dayOfWeek: 0, closed: true, opensAt: null, closesAt: null },
        { dayOfWeek: 1, closed: false, opensAt: '09:00', closesAt: '18:00' },
        { dayOfWeek: 2, closed: false, opensAt: '09:00', closesAt: '18:00' },
        { dayOfWeek: 3, closed: false, opensAt: '09:00', closesAt: '18:00' },
        { dayOfWeek: 4, closed: false, opensAt: '09:00', closesAt: '18:00' },
        { dayOfWeek: 5, closed: false, opensAt: '09:00', closesAt: '18:00' },
        { dayOfWeek: 6, closed: false, opensAt: '09:00', closesAt: '13:00' },
      ],
      signupRequestId: REQUEST_ID,
      termsAccepted: true,
    });
  });

  it('SIGN-09: com imagem, envia a imagem guardada depois de gravar o cookie', async () => {
    apiAnswers(201, SIGNUP_RESPONSE);
    const upload = vi.fn(async (_fd: FormData) => {
      expect(store.set).toHaveBeenCalled();
      return { ok: true };
    });
    const image = new File([new Uint8Array(512)], 'logo.png', {
      type: 'image/png',
    });

    const error = await createAccount(form(payload(), image), upload).catch(
      (e: unknown) => e,
    );

    expect(redirectTarget(error)).toBe('/painel');
    expect(upload).toHaveBeenCalledTimes(1);
    const sent = upload.mock.calls[0]![0].get('file') as File;
    expect(sent.name).toBe('logo.png');
    expect(sent.size).toBe(512);
  });

  it('falha no envio da imagem ainda redireciona para /painel', async () => {
    apiAnswers(201, SIGNUP_RESPONSE);
    const upload = vi.fn(async () => {
      throw new Error('bucket fora');
    });
    const image = new File([new Uint8Array(512)], 'logo.png', {
      type: 'image/png',
    });

    const error = await createAccount(form(payload(), image), upload).catch(
      (e: unknown) => e,
    );

    expect(upload).toHaveBeenCalledTimes(1);
    expect(redirectTarget(error)).toBe('/painel');
  });

  it('SIGN-31: 409 com field "email" devolve step "contato" com o erro', async () => {
    apiAnswers(409, {
      statusCode: 409,
      error: 'Conflict',
      message: 'Este e-mail já tem cadastro.',
      field: 'email',
    });

    await expect(createAccount(form(), noUpload())).resolves.toEqual({
      ok: false,
      step: 'contato',
      field: 'email',
      error: 'Este e-mail já tem cadastro.',
    });
    expect(store.set).not.toHaveBeenCalled();
  });

  it('SIGN-31: 409 com field "cnpj" devolve step "sobre" com a mensagem do SIGN-05', async () => {
    apiAnswers(409, { statusCode: 409, message: 'x', field: 'cnpj' });

    await expect(createAccount(form(), noUpload())).resolves.toEqual({
      ok: false,
      step: 'sobre',
      field: 'cnpj',
      error:
        'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.',
    });
  });

  it('DEMO-07: 409 de cota fica na revisão com a mensagem exata', async () => {
    apiAnswers(409, { statusCode: 409, error: 'Conflict', message: DEMO_07 });

    await expect(createAccount(form(), noUpload())).resolves.toEqual({
      ok: false,
      step: null,
      error: DEMO_07,
    });
  });

  it('DEMO-07: 409 sem mensagem usa o texto do DEMO-07', async () => {
    apiAnswers(409, { statusCode: 409 });

    await expect(createAccount(form(), noUpload())).resolves.toMatchObject({
      step: null,
      error: DEMO_07,
    });
  });

  it('DEMO-07: 409 sem corpo também usa o texto do DEMO-07', async () => {
    server.use(
      http.post(NGOS_URL, () => new HttpResponse(null, { status: 409 })),
    );

    await expect(createAccount(form(), noUpload())).resolves.toMatchObject({
      step: null,
      error: DEMO_07,
    });
  });

  it('SIGN-32: o mesmo cadastro com outra senha mostra a mensagem da api', async () => {
    apiAnswers(409, {
      statusCode: 409,
      message: 'Este cadastro já foi enviado.',
    });

    await expect(createAccount(form(), noUpload())).resolves.toMatchObject({
      step: null,
      error: 'Este cadastro já foi enviado.',
    });
  });

  it('DEMO-08: 429 devolve a mensagem exata do limite por rede', async () => {
    apiAnswers(429, {
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    });

    await expect(createAccount(form(), noUpload())).resolves.toEqual({
      ok: false,
      step: null,
      error: DEMO_08,
    });
  });

  it.each([
    [400, 'Confira os dados desta etapa e tente de novo.'],
    [500, 'Não foi possível criar a conta agora. Tente de novo.'],
  ])('%i da api fica na revisão com um erro', async (status, message) => {
    apiAnswers(status, { statusCode: status });

    await expect(createAccount(form(), noUpload())).resolves.toEqual({
      ok: false,
      step: null,
      error: message,
    });
  });

  it('valida a entrada: uma etapa inválida volta para ela sem chamar a api', async () => {
    const calls = apiAnswers(201, SIGNUP_RESPONSE);
    const data = payload();
    data.address.location = null;

    await expect(createAccount(form(data), noUpload())).resolves.toEqual({
      ok: false,
      step: 'endereco',
      error: 'Confira os dados desta etapa e tente de novo.',
    });
    expect(calls).toHaveLength(0);
  });

  it('signupRequestId que não é uuid fica na revisão', async () => {
    await expect(
      createAccount(form({ ...payload(), signupRequestId: 'abc' }), noUpload()),
    ).resolves.toEqual({
      ok: false,
      step: null,
      error: 'Confira os dados desta etapa e tente de novo.',
    });
  });

  it('SIGN-27: sem o aceite dos Termos volta para a revisão', async () => {
    const data = payload();
    data.review.termsAccepted = false;

    await expect(createAccount(form(data), noUpload())).resolves.toMatchObject({
      step: 'revisao',
    });
  });

  it.each([['não é json'], ['"texto"']])(
    'corpo que não é o assistente (%s) é recusado sem chamar a api',
    async (raw) => {
      const calls = apiAnswers(201, SIGNUP_RESPONSE);

      await expect(createAccount(form(raw), noUpload())).resolves.toEqual({
        ok: false,
        step: null,
        error: 'Confira os dados desta etapa e tente de novo.',
      });
      expect(calls).toHaveLength(0);
    },
  );

  it('sem o campo data é recusado', async () => {
    await expect(
      createAccount(new FormData(), noUpload()),
    ).resolves.toMatchObject({
      ok: false,
      step: null,
    });
  });
});
