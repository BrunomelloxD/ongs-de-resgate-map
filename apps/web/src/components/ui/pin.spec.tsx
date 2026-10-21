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

  it('aceita um rótulo com o nome da ONG', () => {
    render(<Pin variant="open" label="Patas do Bairro, aberta agora" />);

    expect(
      screen.getByRole('img', { name: 'Patas do Bairro, aberta agora' }),
    ).toHaveAttribute('data-variant', 'open');
  });
});
