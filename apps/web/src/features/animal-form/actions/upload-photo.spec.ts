// @vitest-environment node
// A Server Action runs on Node: jsdom's FormData and File break Node's fetch.
import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { uploadPhoto } from './upload-photo';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.42' }),
}));

const IMAGES_URL = `${TEST_API_URL}/api/v1/me/images`;
// MAX_UPLOAD_MB is 5 in test/setup.ts; MB = 1024².
const LIMIT = 5 * 1024 * 1024;
const AFORM_08 = 'Envie JPG, PNG, WebP ou HEIC de até 5 MB.';
const UPLOADED = {
  id: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  thumbUrl: '/img/ngos/x/images/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f-160.webp',
  width: 1200,
  height: 900,
};

function form(file?: File | string) {
  const data = new FormData();
  if (file !== undefined) data.set('file', file);
  return data;
}

const photo = (type = 'image/jpeg', size = 1024, name = 'mel.jpg') =>
  new File([new Uint8Array(size)], name, { type });

function apiAnswers(response: () => Response) {
  const calls: { auth: string | null; file: FormDataEntryValue | null }[] = [];
  server.use(
    http.post(IMAGES_URL, async ({ request }) => {
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

describe('uploadPhoto', () => {
  it('AFORM-09: 201 envia o arquivo com a sessão e devolve { id, thumbUrl }', async () => {
    const calls = apiAnswers(() =>
      HttpResponse.json(UPLOADED, { status: 201 }),
    );

    await expect(uploadPhoto(form(photo()))).resolves.toEqual({
      ok: true,
      id: UPLOADED.id,
      thumbUrl: UPLOADED.thumbUrl,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.auth).toBe('Bearer token-abc');
    expect((calls[0]!.file as File).name).toBe('mel.jpg');
  });

  it.each([
    ['HEIC', photo('image/heic', 1024, 'mel.heic')],
    ['HEIC sem tipo (Chrome)', photo('', 1024, 'IMG_0001.HEIC')],
    ['JPG no limite exato', photo('image/jpeg', LIMIT)],
  ])('AFORM-08: aceita %s', async (_case, file) => {
    const calls = apiAnswers(() =>
      HttpResponse.json(UPLOADED, { status: 201 }),
    );

    await expect(uploadPhoto(form(file))).resolves.toMatchObject({ ok: true });
    expect(calls).toHaveLength(1);
  });

  it.each([
    ['GIF', photo('image/gif', 1024, 'mel.gif')],
    ['acima do limite', photo('image/jpeg', LIMIT + 1)],
    ['sem arquivo', undefined],
    ['texto no lugar do arquivo', 'mel.jpg'],
  ])('AFORM-08: %s é recusado antes da api', async (_case, file) => {
    const calls = apiAnswers(() =>
      HttpResponse.json(UPLOADED, { status: 201 }),
    );

    await expect(uploadPhoto(form(file))).resolves.toEqual({
      ok: false,
      error: AFORM_08,
    });
    expect(calls).toHaveLength(0);
  });

  it('AFORM-08: 400 da api (conteúdo não é imagem) devolve a mensagem do AFORM-08', async () => {
    apiAnswers(() => HttpResponse.json({ message: AFORM_08 }, { status: 400 }));

    await expect(uploadPhoto(form(photo()))).resolves.toEqual({
      ok: false,
      error: AFORM_08,
    });
  });

  it('DEMO-11: 413 devolve "O arquivo passa de 5 MB."', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        { message: 'O arquivo passa de 5 MB.' },
        { status: 413 },
      ),
    );

    await expect(uploadPhoto(form(photo()))).resolves.toEqual({
      ok: false,
      error: 'O arquivo passa de 5 MB.',
    });
  });

  it.each([
    'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    'Este animal já tem o máximo de 3 fotos da demo.',
  ])('DEMO-10/DEMO-12: 409 devolve a mensagem da cota: %s', async (message) => {
    apiAnswers(() => HttpResponse.json({ message }, { status: 409 }));

    await expect(uploadPhoto(form(photo()))).resolves.toEqual({
      ok: false,
      error: message,
    });
  });

  it('DEMO-12: 409 sem corpo devolve a mensagem do armazenamento', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 409 }));

    await expect(uploadPhoto(form(photo()))).resolves.toEqual({
      ok: false,
      error:
        'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    });
  });

  it.each([
    ['500', () => HttpResponse.json({ message: 'erro' }, { status: 500 })],
    ['api fora do ar', () => HttpResponse.error()],
  ])('AFORM-09: %s devolve o erro genérico de envio', async (_case, answer) => {
    apiAnswers(answer);

    await expect(uploadPhoto(form(photo()))).resolves.toEqual({
      ok: false,
      error: 'Não foi possível enviar a foto. Tente de novo.',
    });
  });

  it('AUTH-07: 401 redireciona para /session/end', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'x' }, { status: 401 }));

    const error = await uploadPhoto(form(photo())).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
