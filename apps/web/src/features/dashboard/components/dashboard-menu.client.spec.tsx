import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardMenu } from './dashboard-menu.client';

const PROPS = {
  ngoName: 'Patas do Bairro',
  email: 'contato@patas.org',
  imageUrl: null,
  slug: 'patas-do-bairro',
  logoutAction: vi.fn(),
};

describe('DashboardMenu', () => {
  it('≡ abre o mesmo menu da barra lateral, com a ONG, os itens e "Sair"', async () => {
    render(<DashboardMenu {...PROPS} currentPath="/painel" />);
    const open = screen.getByRole('button', { name: 'Abrir menu' });

    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(open);

    const dialog = screen.getByRole('dialog', { name: 'Área da ONG' });
    expect(dialog).toHaveTextContent('Patas do Bairro');
    expect(dialog).toHaveTextContent('contato@patas.org');
    expect(screen.getByRole('link', { name: 'Perfil da ONG' })).toHaveAttribute(
      'href',
      '/painel/perfil',
    );
    expect(
      screen.getByRole('link', { name: 'Ver página pública' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('Esc e o ✕ fecham, e o foco volta ao ≡', async () => {
    render(<DashboardMenu {...PROPS} currentPath="/painel" />);
    const open = screen.getByRole('button', { name: 'Abrir menu' });

    await userEvent.click(open);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(open).toHaveFocus();

    await userEvent.click(open);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // The Tab trap itself runs in a real browser: dashboard-menu.client.stories.tsx.
  it('ao abrir, o foco entra no menu', async () => {
    render(<DashboardMenu {...PROPS} currentPath="/painel" />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    );
  });

  it('fecha sozinho quando a página muda', async () => {
    const { rerender } = render(
      <DashboardMenu {...PROPS} currentPath="/painel" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<DashboardMenu {...PROPS} currentPath="/painel/perfil" />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
