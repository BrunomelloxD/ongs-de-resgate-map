import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeProfileValues, makeWeek } from '../test-fixtures';
import { updateProfile } from './update-profile';

const store = vi.hoisted(() => ({ get: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.42' }),
}));
vi.mock('next/cache', () => ({ refresh }));

const NGO_URL = `${TEST_API_URL}/api/v1/me/ngo`;
const NO_ERRORS = { fields: {}, hours: {} };

function apiAnswers(response: () => Response) {
  const calls: { auth: string | null; body: Record<string, unknown> }[] = [];
  server.use(
    http.patch(NGO_URL, async ({ request }) => {
      calls.push({
        auth: request.headers.get('authorization'),
        body: (await request.json()) as Record<string, unknown>,
      });
      return response();
    }),
  );
  return calls;
}

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

beforeEach(() => {
  vi.clearAllMocks();
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('updateProfile', () => {
  it('PROF-04: 200 → "Perfil atualizado." e a página é atualizada', async () => {
    const calls = apiAnswers(() => HttpResponse.json({}));

    await expect(updateProfile(makeProfileValues())).resolves.toEqual({
      ok: true,
      message: 'Perfil atualizado.',
    });
    expect(calls[0]!.auth).toBe('Bearer token-abc');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('PROF-02: o corpo enviado nunca contém o CNPJ, mesmo se o cliente mandar', async () => {
    const calls = apiAnswers(() => HttpResponse.json({}));
    const values = { ...makeProfileValues(), cnpj: '11222333000181' };

    await updateProfile(values);

    expect(calls[0]!.body).not.toHaveProperty('cnpj');
  });

  it('PROF-04: envia os dados normalizados, como a api recebe', async () => {
    const calls = apiAnswers(() => HttpResponse.json({}));

    await updateProfile(makeProfileValues({ complement: '' }));

    expect(calls[0]!.body).toEqual({
      legalName: 'Patas do Bairro',
      description: 'Resgatamos cães e gatos na Vila Mariana desde 2015.',
      email: 'contato@patas.org',
      whatsapp: '5511987654321',
      cep: '04101300',
      street: 'Rua Vergueiro',
      number: '3000',
      complement: null,
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
      lat: -23.5869,
      lng: -46.6347,
      locationConfirmedAt: '2026-10-20T12:00:00.000Z',
      openingHours: makeWeek(),
    });
  });

  it('PROF-03: sem o pino confirmado de novo, nada vai à api', async () => {
    const calls = apiAnswers(() => HttpResponse.json({}));

    const result = await updateProfile(makeProfileValues({ location: null }));

    expect(result).toEqual({
      ok: false,
      errors: {
        fields: {
          location: 'Confirme a localização no mapa antes de salvar.',
        },
        hours: {},
      },
      error: 'Confira os campos marcados.',
    });
    expect(calls).toHaveLength(0);
  });

  it('valida cada campo e cada dia com as regras do cadastro', async () => {
    const week = makeWeek().map((day) =>
      day.dayOfWeek === 2 ? { ...day, closesAt: '08:00' } : day,
    );

    const result = await updateProfile(
      makeProfileValues({
        legalName: ' ',
        email: 'sem-arroba',
        openingHours: week,
      }),
    );

    expect(result).toEqual({
      ok: false,
      errors: {
        fields: {
          legalName: 'Informe a razão social.',
          email: 'Informe um e-mail válido, como nome@ong.org.',
        },
        hours: { 2: 'O horário de fechamento deve ser depois da abertura.' },
      },
      error: 'Confira os campos marcados.',
    });
  });

  it('uma semana sem os 7 dias não aponta para nenhum dia', async () => {
    const result = await updateProfile(
      makeProfileValues({ openingHours: makeWeek().slice(0, 6) }),
    );

    expect(result).toEqual({
      ok: false,
      errors: NO_ERRORS,
      error: 'Confira os campos marcados.',
    });
  });

  it('PROF-03: o 400 da api sem nova confirmação do pino vai para o mapa', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        { message: 'Confirme a localização no mapa antes de salvar.' },
        { status: 400 },
      ),
    );

    await expect(updateProfile(makeProfileValues())).resolves.toEqual({
      ok: false,
      errors: {
        fields: {
          location: 'Confirme a localização no mapa antes de salvar.',
        },
        hours: {},
      },
      error: 'Confira os campos marcados.',
    });
  });

  it('400 da validação da api → erro no campo citado', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        {
          message: ['whatsapp must match /^55/', 'property x should not exist'],
        },
        { status: 400 },
      ),
    );

    await expect(updateProfile(makeProfileValues())).resolves.toEqual({
      ok: false,
      errors: { fields: { whatsapp: 'Confira este campo.' }, hours: {} },
      error: 'Confira os campos marcados.',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('409 (e-mail de outra ONG) → erro no e-mail', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        { message: 'Este e-mail já tem cadastro.', field: 'email' },
        { status: 409 },
      ),
    );

    await expect(updateProfile(makeProfileValues())).resolves.toEqual({
      ok: false,
      errors: { fields: { email: 'Este e-mail já tem cadastro.' }, hours: {} },
      error: 'Confira os campos marcados.',
    });
  });

  it('500 → erro geral, sem erro nos campos', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 500 }));

    await expect(updateProfile(makeProfileValues())).resolves.toEqual({
      ok: false,
      errors: NO_ERRORS,
      error: 'Não foi possível salvar o perfil agora. Tente de novo.',
    });
  });

  it('AUTH-07: 401 → /session/end', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 401 }));

    const error = await updateProfile(makeProfileValues()).catch(
      (e: unknown) => e,
    );

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
