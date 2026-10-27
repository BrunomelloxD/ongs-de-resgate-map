import { LockedDemoRedirect } from './locked-demo-redirect';

const getDemoInfo = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
);
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/features/demo', () => ({ getDemoInfo }));

describe('LockedDemoRedirect (/localizacao)', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('demo fechada: vai direto para /mapa (DEP-21)', async () => {
    getDemoInfo.mockResolvedValue({ locked: true });

    await expect(LockedDemoRedirect()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/mapa');
  });

  it('demo aberta: fica na escolha do local (DEP-23)', async () => {
    getDemoInfo.mockResolvedValue({ locked: false });

    expect(await LockedDemoRedirect()).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('api fora do ar: fica na escolha do local', async () => {
    getDemoInfo.mockRejectedValue(new Error('GET /demo failed.'));

    expect(await LockedDemoRedirect()).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
