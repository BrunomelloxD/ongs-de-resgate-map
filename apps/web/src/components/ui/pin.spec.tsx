import { render, screen } from '@testing-library/react';
import { Pin, type PinVariant } from './pin';

const CASES: [PinVariant, string][] = [
  ['open', 'ONG aberta agora'],
  ['closed', 'ONG fechada agora'],
  ['selected', 'ONG selecionada'],
  ['visitor', 'Sua localização'],
];

describe('Pin (MAP-03)', () => {
  it.each(CASES)('%s tem data-variant e rótulo próprio', (variant, label) => {
    render(<Pin variant={variant} />);

    const pin = screen.getByRole('img', { name: label });
    expect(pin).toHaveAttribute('data-variant', variant);
  });

  it('as 4 variantes têm formas diferentes', () => {
    const { container } = render(
      <>
        {CASES.map(([variant]) => (
          <Pin key={variant} variant={variant} />
        ))}
      </>,
    );
    const shapes = [...container.querySelectorAll('svg')].map(
      (svg) => `${svg.getAttribute('width')}|${svg.innerHTML}`,
    );

    expect(new Set(shapes).size).toBe(4);
    expect(new Set(CASES.map(([, label]) => label)).size).toBe(4);
  });

  it('a posição do visitante é um círculo, e as ONGs são gotas', () => {
    const { container } = render(
      <>
        <Pin variant="visitor" />
        <Pin variant="open" />
      </>,
    );
    const [visitor, open] = container.querySelectorAll('svg');

    expect(visitor!.querySelector('path')).toBeNull();
    expect(open!.querySelector('path')).not.toBeNull();
  });

  it('o pino selecionado é maior que o comum', () => {
    render(
      <>
        <Pin variant="open" />
        <Pin variant="selected" />
      </>,
    );

    expect(
      Number(
        screen
          .getByRole('img', { name: 'ONG selecionada' })
          .getAttribute('width'),
      ),
    ).toBeGreaterThan(
      Number(
        screen
          .getByRole('img', { name: 'ONG aberta agora' })
          .getAttribute('width'),
      ),
    );
  });

  it.each([
    ['open', 30, 39],
    ['closed', 30, 39],
    ['selected', 48, 62],
    ['visitor', 44, 44],
  ] as const)(
    '%s tem o tamanho do Pin/* do figcraft (%i×%i)',
    (variant, w, h) => {
      render(<Pin variant={variant} />);
      const pin = screen.getByRole('img');

      expect(Number(pin.getAttribute('width'))).toBe(w);
      expect(Number(pin.getAttribute('height'))).toBe(h);
    },
  );

  it('aberta é verde-mata com ponto amarelo; fechada, cinza cheio com ponto claro', () => {
    const { container } = render(
      <>
        <Pin variant="open" />
        <Pin variant="closed" />
      </>,
    );
    const [open, closed] = container.querySelectorAll('svg');

    expect(open!.querySelector('path')).toHaveClass('fill-pin-open');
    expect(open!.querySelector('circle')).toHaveClass('fill-brand');
    expect(closed!.querySelector('path')).toHaveClass('fill-pin-closed');
    expect(closed!.querySelector('circle')).toHaveClass('fill-pin-closed-dot');
  });

  it('selecionada é amarela, com a foto da ONG recortada em pino', () => {
    const { container } = render(
      <Pin variant="selected" photoUrl="/img/patas.webp" />,
    );
    const image = container.querySelector('image')!;
    const clip = container.querySelector('clipPath')!;

    expect(container.querySelector('path')).toHaveClass('fill-brand');
    expect(image).toHaveAttribute('href', '/img/patas.webp');
    expect(image).toHaveAttribute('clip-path', `url(#${clip.id})`);
  });

  it('selecionada sem foto mostra o ponto verde-mata', () => {
    const { container } = render(<Pin variant="selected" />);

    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('circle')).toHaveClass('fill-pin-open');
  });

  it('você é o ponto azul com halo', () => {
    const { container } = render(<Pin variant="visitor" />);
    const [halo, , dot] = container.querySelectorAll('circle');

    expect(halo).toHaveClass('fill-visitor/20');
    expect(dot).toHaveClass('fill-visitor');
  });

  it('aceita um rótulo com o nome da ONG', () => {
    render(<Pin variant="open" label="Patas do Bairro, aberta agora" />);

    expect(
      screen.getByRole('img', { name: 'Patas do Bairro, aberta agora' }),
    ).toHaveAttribute('data-variant', 'open');
  });
});
