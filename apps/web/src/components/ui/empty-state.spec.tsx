import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('mostra título e texto, sem ações nem ilustração', () => {
    const { container } = render(
      <EmptyState
        title="Nenhuma ONG por aqui"
        description="Tente aumentar o raio da busca."
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Nenhuma ONG por aqui' }),
    ).toBeVisible();
    expect(screen.getByText('Tente aumentar o raio da busca.')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="empty-state-actions"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="empty-state-illustration"]'),
    ).toBeNull();
  });

  it('renderiza a ação recebida', () => {
    render(
      <EmptyState
        title="Sem animais"
        description="Cadastre o primeiro."
        actions={[<Button key="a">Cadastrar animal</Button>]}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Cadastrar animal' }),
    ).toBeVisible();
  });

  it('renderiza as duas ações na ordem recebida', () => {
    render(
      <EmptyState
        title="Sem resultados"
        description="Nada encontrado."
        actions={[
          <Button key="a">Aumentar o raio</Button>,
          <Button key="b" variant="outline">
            Limpar filtros
          </Button>,
        ]}
      />,
    );

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Aumentar o raio', 'Limpar filtros']);
  });

  it('mostra a ilustração decorativa quando recebida', () => {
    const { container } = render(
      <EmptyState
        title="Vazio"
        description="Nada aqui."
        illustration={<svg data-testid="art" />}
        className="extra"
      />,
    );
    const slot = container.querySelector(
      '[data-slot="empty-state-illustration"]',
    );

    expect(slot).toHaveAttribute('aria-hidden', 'true');
    expect(slot).toContainElement(screen.getByTestId('art'));
    expect(container.firstElementChild!.className).toContain('extra');
  });
});
