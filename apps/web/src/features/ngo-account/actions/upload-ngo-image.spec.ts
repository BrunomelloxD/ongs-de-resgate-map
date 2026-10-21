// @vitest-environment node
// A Server Action runs on Node: jsdom's FormData and File break Node's fetch.
import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { uploadNgoImage } from './upload-ngo-image';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.40' }),
}));

const IMAGE_URL = `${TEST_API_URL}/api/v1/me/ngo/image`;
// MAX_UPLOAD_MB is 5 in test/setup.ts; MB = 1024².
const LIMIT = 5 * 1024 * 1024;
const SIGN_10 = 'Envie JPG, PNG ou WebP de até 5 MB.';

function form(file?: File | string) {
  const data = new FormData();
  if (file !== undefined) data.set('file', file);
  return data;
}

const image = (type = 'image/png', size = 1024, name = 'logo.png') =>
  new File([new Uint8Array(size)], name, { type });

function apiAnswers(response: () => Response) {
  const calls: { auth: string | null; file: FormDataEntryValue | null }[] = [];
  server.use(
    http.put(IMAGE_URL, async ({ request }) => {
      calls.push({
        auth: request.headers.get('authorization'),
        file: (await request.formData()).get('file'),
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
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('uploadNgoImage', () => {
  it('SIGN-09: 200 envia o arquivo com a sessão e devolve a URL da imagem', async () => {
    const calls = apiAnswers(() =>
      HttpResponse.json({ imageUrl: '/img/ngos/x/logo/y-600.webp' }),
    );

    await expect(uploadNgoImage(form(image()))).resolves.toEqual({
      ok: true,
      imageUrl: '/img/ngos/x/logo/y-600.webp',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.auth).toBe('Bearer token-abc');
    expect((calls[0]!.file as File).name).toBe('logo.png');
  });

  it.each(['image/jpeg', 'image/webp'])(
    'SIGN-09: aceita %s no limite exato de tamanho',
    async (type) => {
      const calls = apiAnswers(() => HttpResponse.json({ imageUrl: null }));

      await expect(
        uploadNgoImage(form(image(type, LIMIT))),
      ).resolves.toMatchObject({ ok: true });
      expect(calls).toHaveLength(1);
    },
  );

  it.each([
    ['GIF', image('image/gif', 1024, 'logo.gif')],
    ['HEIC', image('image/heic', 1024, 'logo.heic')],
    ['acima do limite', image('image/png', LIMIT + 1)],
    ['sem arquivo', undefined],
    ['texto no lugar do arquivo', 'logo.png'],
  ])('SIGN-10: %s é recusado antes da api', async (_case, file) => {
    const calls = apiAnswers(() => HttpResponse.json({ imageUrl: null }));

    await expect(uploadNgoImage(form(file))).resolves.toEqual({
      ok: false,
      error: SIGN_10,
    });
    expect(calls).toHaveLength(0);
  });

  it.each([
    [400, 'Envie JPG, PNG ou WebP de até 5 MB.'],
    [413, 'O arquivo passa de 5 MB.'],
  ])(
    'SIGN-10, DEMO-11: %i da api devolve a mensagem do SIGN-10',
    async (status, message) => {
      apiAnswers(() => HttpResponse.json({ message }, { status }));

      await expect(uploadNgoImage(form(image()))).resolves.toEqual({
        ok: false,
        error: SIGN_10,
      });
    },
  );

  it('DEMO-12: 409 de armazenamento devolve a mensagem do spec', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        {
          message:
            'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
        },
        { status: 409 },
      ),
    );

    await expect(uploadNgoImage(form(image()))).resolves.toEqual({
      ok: false,
      error:
        'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    });
  });

  it('outro erro da api devolve a mensagem genérica', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 503 }));

    await expect(uploadNgoImage(form(image()))).resolves.toEqual({
      ok: false,
      error: 'Não foi possível enviar a imagem agora. Tente de novo.',
    });
  });

  it('sem sessão, redireciona para /session/end', async () => {
    store.get.mockReturnValue(undefined);

    const error = await uploadNgoImage(form(image())).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
