import { render, screen } from '@testing-library/react';
import { ActionBar } from './action-bar';
import { Button } from './button';

function renderBar(
  props: Partial<React.ComponentProps<typeof ActionBar>> = {},
) {
  return render(
    <ActionBar {...props}>
      <Button variant="outline">Voltar</Button>
      <Button>Ir para Endereço</Button>
    </ActionBar>,
  );
}

const bar = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="action-bar"]')!;

describe('ActionBar', () => {
  it('no celular fica fixa no rodapé, branca, com sombra e a área segura do iOS (PERF-07)', () => {
    const { container } = renderBar();
    const { className } = bar(container);

    expect(className).toContain('fixed');
    expect(className).toContain('bottom-0');
    expect(className).toContain('bg-surface');
    expect(className).toContain('shadow-[0_-6px_24px_rgb(23_36_30/0.12)]');
    expect(className).toContain('env(safe-area-inset-bottom)');
  });

  it('sem texto de apoio, não marca data-hint (o body reserva 5,5rem no celular)', () => {
    const { container } = renderBar();

    expect(bar(container)).not.toHaveAttribute('data-hint');
  });

  it('no desktop volta ao fluxo, com "Voltar" à esquerda e o primário à direita', () => {
    const { container } = renderBar();
    const row = bar(container).firstElementChild!;

    expect(bar(container).className).toContain('lg:static');
    expect(row.className).toContain('lg:*:flex-none');
    expect(row.className).toContain('lg:*:last:ml-auto');
    expect([...row.children].map((child) => child.textContent)).toEqual([
      'Voltar',
      'Ir para Endereço',
    ]);
  });

  it('stretch mantém a largura total e mostra o texto de apoio, marcado em data-hint', () => {
    const { container } = renderBar({
      layout: 'stretch',
      hint: 'Abre o WhatsApp da ONG com uma mensagem pronta sobre o Caramelo.',
      className: 'extra',
    });

    expect(bar(container).firstElementChild!.className).not.toContain(
      'lg:*:flex-none',
    );
    expect(
      screen.getByText(
        'Abre o WhatsApp da ONG com uma mensagem pronta sobre o Caramelo.',
      ),
    ).toBeInTheDocument();
    expect(bar(container).className).toContain('extra');
    expect(bar(container)).toHaveAttribute('data-hint', '');
  });
});
