import { render, screen, within } from '@testing-library/react';
import { DashboardNav } from './dashboard-nav';

function renderNav(currentPath: string, logoutAction = vi.fn()) {
  render(
    <DashboardNav
      currentPath={currentPath}
      slug="patas-do-bairro"
      logoutAction={logoutAction}
    />,
  );
  return screen.getByRole('navigation', { name: 'Área da ONG' });
}

describe('DashboardNav', () => {
  it('tem "Animais", "Perfil da ONG", "Ver página pública" e "Sair", com os destinos certos', () => {
    const nav = renderNav('/painel');

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Animais', '/painel'],
      ['Perfil da ONG', '/painel/perfil'],
      ['Ver página pública', '/ong/patas-do-bairro'],
    ]);
    expect(within(nav).getByRole('button', { name: 'Sair' })).toHaveAttribute(
      'type',
      'submit',
    );
  });

  it.each([
    ['/painel', 'Animais'],
    ['/painel/animais/novo', 'Animais'],
    ['/painel/animais/abc', 'Animais'],
    ['/painel/perfil', 'Perfil da ONG'],
  ])('em %s, "%s" é o item atual, em pílula amarela', (path, label) => {
    const nav = renderNav(path);
    const current = within(nav).getByRole('link', { name: label });

    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.className).toContain('bg-brand');
    expect(
      within(nav)
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1);
  });

  it('os itens têm alvo de 44 px (A11Y-02)', () => {
    const nav = renderNav('/painel');

    for (const item of [
      ...within(nav).getAllByRole('link'),
      within(nav).getByRole('button'),
    ]) {
      expect(item.className).toContain('touch-target');
    }
  });
});
