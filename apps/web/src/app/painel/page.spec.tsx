import { render, screen } from '@testing-library/react';
import DashboardRoute, { instant, metadata } from './page';

const getMyNgo = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth', () => ({ logout }));
vi.mock('@/features/demo', () => ({
  DemoExpiryNotice: ({ expiresAt }: { expiresAt: string | null }) => (
    <p>aviso {expiresAt}</p>
  ),
}));
vi.mock('@/features/dashboard', () => ({
  dashboardDictionary: { metaTitle: 'Seus animais' },
  getMyNgo,
  DashboardHeader: ({
    ngoName,
    logoutAction,
  }: {
    ngoName: string;
    logoutAction: unknown;
  }) => (
    <p>
      cabeçalho {ngoName} {logoutAction === logout ? 'com logout' : ''}
    </p>
  ),
  DashboardContainer: ({ ngo }: { ngo: { legalName: string } }) => (
    <p>container {ngo.legalName}</p>
  ),
}));

const NGO = {
  legalName: 'Patas do Bairro',
  expiresAt: '2026-10-27T12:00:00.000Z',
};

describe('/painel', () => {
  // T184: the header with "Sair" moved to the /painel layout (layout.spec.tsx).
  it('DASH-01/DEMO-06: compõe o aviso de expiração e o container', async () => {
    getMyNgo.mockResolvedValue(NGO);

    render(await DashboardRoute());

    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('aviso 2026-10-27T12:00:00.000Z');
    expect(main).toHaveTextContent('container Patas do Bairro');
  });

  it('AUTH-07: o redirect do 401 acontece antes de renderizar', async () => {
    getMyNgo.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(DashboardRoute()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('é uma rota bloqueante, para o redirect do 401 ser real', () => {
    expect(instant).toBe(false);
    expect(metadata.title).toBe('Seus animais');
  });
});
