import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { getDemoInfo } from './get-demo-info';

const cacheLife = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ cacheLife }));

const QUOTAS = {
  maxNgos: 30,
  signupsPerIpPerDay: 2,
  maxAnimalsPerNgo: 10,
  maxImagesPerAnimal: 3,
  maxUploadMb: 5,
  maxStorageMb: 500,
};

function respondWith(body: unknown, status = 200) {
  let headers: Headers | undefined;
  server.use(
    http.get(`${TEST_API_URL}/api/v1/demo`, ({ request }) => {
      headers = request.headers;
      return HttpResponse.json(body as object, { status });
    }),
  );
  return () => headers;
}

describe('getDemoInfo', () => {
  it('demo ligada: devolve retenção e cotas da api', async () => {
    const received = respondWith({
      enabled: true,
      retentionDays: 7,
      quotas: QUOTAS,
    });

    await expect(getDemoInfo()).resolves.toEqual({
      enabled: true,
      retentionDays: 7,
      quotas: QUOTAS,
    });
    expect(received()?.get('X-Internal-Token')).toBe(
      process.env['INTERNAL_API_TOKEN'],
    );
  });

  it('demo desligada (DEMO-20): devolve enabled=false', async () => {
    respondWith({
      enabled: false,
      retentionDays: 7,
      quotas: { ...QUOTAS, maxImagesPerAnimal: 8, maxUploadMb: 10 },
    });

    const info = await getDemoInfo();

    expect(info.enabled).toBe(false);
    expect(info.quotas.maxImagesPerAnimal).toBe(8);
  });

  it('guarda o resultado em cache por minutos', async () => {
    respondWith({ enabled: true, retentionDays: 7, quotas: QUOTAS });

    await getDemoInfo();

    expect(cacheLife).toHaveBeenCalledWith('minutes');
  });

  it('falha quando a api responde erro', async () => {
    respondWith({ message: 'erro' }, 500);

    await expect(getDemoInfo()).rejects.toThrow('GET /demo failed.');
  });
});
