import { render, screen } from '@testing-library/react';
import PainelLayout, { instant } from './layout';

const getMyNgo = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());
const rethrow = vi.hoisted(() =>
  vi.fn((error: unknown) => {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT')
      throw error;
  }),
);

vi.mock('next/navigation', () => ({ unstable_rethrow: rethrow }));
vi.mock('@/features/auth', () => ({ logout }));
vi.mock('@/features/dashboard', () => ({ getMyNgo }));
vi.mock('./painel-shell.client', () => ({
  PainelShell: ({
    ngo,
    logoutAction,
    children,
  }: {
    ngo: Record<string, unknown>;
    logoutAction: unknown;
    children: React.ReactNode;
  }) => (
    <div data-testid="shell" data-ngo={JSON.stringify(ngo)}>
      {logoutAction === logout ? 'com logout' : 'sem logout'}
      {children}
    </div>
  ),
}));

const NGO = {
  legalName: 'Patas do Bairro',
  email: 'contato@patas.org',
  imageUrl: '/img/logo.webp',
  slug: 'patas-do-bairro',
  cnpj: '11222333000181',
};

describe('/painel layout', () => {
  it('é bloqueante, como as páginas do painel (AUTH-07)', () => {
    expect(instant).toBe(false);
  });

  it('T184/AUTH-05: envolve a página na casca com a ONG da sessão e o "Sair" (logout)', async () => {
    getMyNgo.mockResolvedValue(NGO);

    render(await PainelLayout({ children: <main>página</main> }));

    const shell = screen.getByTestId('shell');
    expect(JSON.parse(shell.dataset['ngo']!)).toEqual({
      legalName: 'Patas do Bairro',
      email: 'contato@patas.org',
      imageUrl: '/img/logo.webp',
      slug: 'patas-do-bairro',
    });
    expect(shell).toHaveTextContent('com logout');
    expect(screen.getByRole('main')).toHaveTextContent('página');
  });

  it('AUTH-07: o redirect do 401 segue adiante', async () => {
    getMyNgo.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(PainelLayout({ children: <main /> })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
  });

  it('com a api fora do ar, mostra só a página, cujo error.tsx trata a falha', async () => {
    getMyNgo.mockRejectedValue(new Error('GET /me/ngo failed: 503'));

    render(await PainelLayout({ children: <main>página</main> }));

    expect(screen.queryByTestId('shell')).toBeNull();
    expect(screen.getByRole('main')).toHaveTextContent('página');
  });
});
