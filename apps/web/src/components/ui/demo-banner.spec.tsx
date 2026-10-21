import { render, screen } from '@testing-library/react';
import { DemoBanner } from './demo-banner';

describe('DemoBanner', () => {
  it('days=7 mostra o texto exato do DEMO-01 com link para /sobre-a-demo', () => {
    render(<DemoBanner days={7} />);

    const link = screen.getByRole('link', {
      name: 'Demonstração: os dados são apagados em 7 dias',
    });
    expect(link).toHaveAttribute('href', '/sobre-a-demo');
  });

  it('usa o número de dias recebido', () => {
    render(<DemoBanner days={30} />);

    expect(
      screen.getByRole('link', {
        name: 'Demonstração: os dados são apagados em 30 dias',
      }),
    ).toBeVisible();
  });

  it('o link tem alvo de toque de 44 px (A11Y-02)', () => {
    render(<DemoBanner days={7} />);

    expect(screen.getByRole('link').className).toContain('touch-target');
  });
});
