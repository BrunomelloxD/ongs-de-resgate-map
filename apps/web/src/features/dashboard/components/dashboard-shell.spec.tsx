import { render, screen, within } from '@testing-library/react';
import { DashboardShell } from './dashboard-shell';

const NGO = {
  legalName: 'Patas do Bairro',
  email: 'contato@patas.org',
  imageUrl: null,
  slug: 'patas-do-bairro',
};

function renderShell(currentPath: string) {
  return render(
    <DashboardShell ngo={NGO} currentPath={currentPath} logoutAction={vi.fn()}>
      <main>conteúdo</main>
    </DashboardShell>,
  );
}

describe('DashboardShell', () => {
  it('barra lateral de 300 px verde-mata escuro, só no desktop, com logo, ONG e menu', () => {
    const { container } = renderShell('/painel');
    const sidebar = container.querySelector<HTMLElement>(
      '[data-slot="dashboard-sidebar"]',
    )!;

    expect(sidebar.className).toContain('w-[300px]');
    expect(sidebar.className).toContain('bg-brand-deep-pressed');
    expect(sidebar.className).toContain('hidden');
    expect(sidebar.className).toContain('lg:block');
    expect(within(sidebar).getByText('Animal Helper')).toBeInTheDocument();
    expect(within(sidebar).getByText('contato@patas.org')).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('link', { name: 'Animais' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toHaveTextContent('conteúdo');
  });

  it('no /painel, o celular tem o cabeçalho com a ONG, "Área da ONG" e o ≡', () => {
    const { container } = renderShell('/painel');
    const header = container.querySelector<HTMLElement>(
      '[data-slot="dashboard-mobile-header"]',
    )!;

    expect(header.className).toContain('lg:hidden');
    expect(within(header).getByText('Patas do Bairro')).toBeInTheDocument();
    expect(within(header).getByText('Área da ONG')).toBeInTheDocument();
    expect(
      within(header).getByRole('button', { name: 'Abrir menu' }),
    ).toBeInTheDocument();
  });

  it('nas páginas internas, o celular usa a barra de app da página, sem o cabeçalho', () => {
    const { container } = renderShell('/painel/animais/novo');

    expect(
      container.querySelector('[data-slot="dashboard-mobile-header"]'),
    ).toBeNull();
  });
});
