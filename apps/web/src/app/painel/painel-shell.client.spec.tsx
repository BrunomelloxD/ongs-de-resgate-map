import { render, screen } from '@testing-library/react';
import { PainelShell } from './painel-shell.client';

vi.mock('next/navigation', () => ({ usePathname: () => '/painel/perfil' }));
vi.mock('@/features/dashboard/client', () => ({
  DashboardShell: ({
    currentPath,
    children,
  }: {
    currentPath: string;
    children: React.ReactNode;
  }) => (
    <div>
      caminho {currentPath}
      {children}
    </div>
  ),
}));

describe('PainelShell', () => {
  it('passa o caminho atual para a casca marcar o item do menu', () => {
    render(
      <PainelShell
        ngo={{
          legalName: 'Patas',
          email: 'a@b.org',
          imageUrl: null,
          slug: 'patas',
        }}
        logoutAction={vi.fn()}
      >
        <p>página</p>
      </PainelShell>,
    );

    expect(screen.getByText(/caminho \/painel\/perfil/)).toBeInTheDocument();
    expect(screen.getByText('página')).toBeInTheDocument();
  });
});
