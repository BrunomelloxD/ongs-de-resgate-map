import { render, screen } from '@testing-library/react';
import { PIN_RATIO, PinPhoto } from './pin-photo';

describe('PinPhoto', () => {
  it('recorta a foto com a máscara de pino, na proporção 1:1,3 do Design System', () => {
    const { container } = render(
      <PinPhoto
        width={300}
        image={<img src="/photos/x.webp" alt="Filhote" />}
      />,
    );
    const frame = container.querySelector('[data-slot="pin-photo"]')!;

    expect(PIN_RATIO).toBe(1.3);
    expect(frame).toHaveClass('mask-pin');
    expect(frame).toHaveStyle({ width: '300px', height: '390px' });
    expect(frame).toContainElement(
      screen.getByRole('img', { name: 'Filhote' }),
    );
  });

  it('sem largura, o tamanho vem das classes (um por tamanho de tela)', () => {
    const { container } = render(
      <PinPhoto
        className="w-24 lg:w-[520px]"
        image={<img src="/x" alt="" />}
      />,
    );
    const frame = container.querySelector<HTMLElement>(
      '[data-slot="pin-photo"]',
    )!;

    expect(frame.getAttribute('style')).toBeNull();
    expect(frame).toHaveClass('mask-pin', 'w-24', 'lg:w-[520px]');
  });

  it('com ícone, centraliza-o na cabeça do pino e o esconde do leitor de tela', () => {
    const { container } = render(
      <PinPhoto
        width={64}
        icon={<svg data-testid="icon" />}
        className="bg-brand-deep"
      />,
    );
    const frame = container.querySelector('[data-slot="pin-photo"]')!;
    const head = screen.getByTestId('icon').parentElement!;

    expect(frame).toHaveStyle({ height: '83px' });
    expect(frame).toHaveClass('bg-brand-deep');
    expect(head).toHaveAttribute('aria-hidden', 'true');
    expect(head).toHaveClass('aspect-square', 'top-0');
  });
});
