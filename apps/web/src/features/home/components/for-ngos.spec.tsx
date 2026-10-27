import { render, screen } from '@testing-library/react';
import { ForNgos } from './for-ngos';

describe('ForNgos', () => {
  it('H-04: convida a ONG, com "Cadastrar minha ONG" e "Já tenho conta. Entrar"', () => {
    render(<ForNgos />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Você cuida de animais resgatados?',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Cadastrar minha ONG' }),
    ).toHaveAttribute('href', '/cadastro/sobre');
    expect(
      screen.getByRole('link', { name: 'Já tenho conta. Entrar' }),
    ).toHaveAttribute('href', '/entrar');
  });

  it('T196: é a seção #para-ongs, destino do "Para ONGs" da navbar', () => {
    render(<ForNgos />);

    expect(
      screen.getByRole('region', { name: 'Você cuida de animais resgatados?' }),
    ).toHaveAttribute('id', 'para-ongs');
  });

  it('PERF-02: a foto está abaixo da dobra (lazy), com width, height e alt; em pino no celular', () => {
    const { container } = render(<ForNgos />);
    const img = container.querySelector('img')!;

    const desktop = container.querySelector('source')!;

    expect(img).toHaveAttribute('src', '/photos/home-shelter-sm.webp');
    expect(desktop).toHaveAttribute('media', '(min-width: 1024px)');
    expect(desktop).toHaveAttribute('srcset', '/photos/home-shelter.webp');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '260');
    expect(img).toHaveAttribute('alt', '');
    expect(img.closest('.mask-pin')).toHaveClass('lg:[mask-image:none]');
  });
});
