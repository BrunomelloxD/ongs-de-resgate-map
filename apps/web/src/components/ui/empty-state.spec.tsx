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

  it('`card`: centralizado num cartão, com as ações na largura do texto', () => {
    const { container } = render(
      <EmptyState
        layout="card"
        title="A Patas ainda não cadastrou animais"
        description="Fale com a ONG pelo WhatsApp."
        actions={[
          <a key="w" href="https://wa.me/1">
            Perguntar no WhatsApp
          </a>,
        ]}
      />,
    );
    const root = container.querySelector('[data-slot="empty-state"]')!;

    expect(root).toHaveAttribute('data-layout', 'card');
    expect(root).toHaveClass('items-center', 'text-center', 'bg-subtle');
    expect(
      container.querySelector('[data-slot="empty-state-actions"]'),
    ).not.toHaveClass('*:w-full');
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

  it('fica alinhado à esquerda sobre o fundo, sem o cartão, com os botões empilhados', () => {
    const { container } = render(
      <EmptyState
        title="Vazio"
        description="Nada aqui."
        actions={[<Button key="a">Um</Button>, <Button key="b">Dois</Button>]}
      />,
    );
    const root = container.firstElementChild!;

    expect(root.className).toContain('items-start');
    expect(root.className).toContain('text-left');
    expect(root.className).not.toContain('bg-subtle');
    expect(
      container.querySelector('[data-slot="empty-state-actions"]')!.className,
    ).toContain('flex-col');
  });

  it('a ilustração é um pino (Superfície 2, ou verde-mata no tom brand)', () => {
    const { container, rerender } = render(
      <EmptyState title="Vazio" description="Nada." illustration={<svg />} />,
    );
    const pin = () => container.querySelector('[data-slot="pin-photo"]')!;

    expect(pin()).toHaveClass('mask-pin', 'bg-surface-2');
    expect(pin()).toHaveStyle({ width: '56px' });

    rerender(
      <EmptyState
        title="Vazio"
        description="Nada."
        illustration={<svg />}
        illustrationTone="brand"
      />,
    );
    expect(pin()).toHaveClass('bg-brand-deep');
    expect(pin()).toHaveStyle({ width: '72px' });
  });
});
