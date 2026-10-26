import { render, screen } from '@testing-library/react';
import { Logo } from './logo';

describe('Logo', () => {
  it('mostra o pino cheio com o ponto e "Animal Helper"; o desenho é decorativo', () => {
    const { container } = render(<Logo className="extra" />);
    const logo = container.querySelector('[data-slot="logo"]')!;

    expect(screen.getByText('Animal Helper')).toBeVisible();
    expect(logo.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(logo.querySelector('path')).toHaveClass('fill-pin-open');
    expect(logo.querySelector('circle')).toHaveClass('fill-brand');
    expect(logo.className).toContain('extra');
  });

  it('a versão clara tem pino amarelo e texto branco', () => {
    const { container } = render(<Logo variant="light" />);
    const logo = container.querySelector('[data-slot="logo"]')!;

    expect(logo).toHaveAttribute('data-variant', 'light');
    expect(logo.className).toContain('text-white');
    expect(logo.querySelector('path')).toHaveClass('fill-brand');
    expect(logo.querySelector('circle')).toHaveClass('fill-pin-open');
  });
});
