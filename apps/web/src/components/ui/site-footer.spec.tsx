import { render, screen, within } from '@testing-library/react';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('tem "Animal Helper", a frase, os créditos e os links com os href certos', () => {
    render(<SiteFooter />);
    const footer = screen.getByRole('contentinfo');

    expect(within(footer).getByText('Animal Helper')).toBeInTheDocument();
    expect(
      within(footer).getByText(
        'Um mapa das ONGs que resgatam e cuidam de animais, para quem quer adotar perto de casa.',
      ),
    ).toBeInTheDocument();
    expect(
      within(footer).getByText(
        'Fotos: Wikimedia Commons (CC0, CC BY e CC BY-SA).',
      ),
    ).toBeInTheDocument();
    const nav = within(footer).getByRole('navigation', { name: 'Rodapé' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Para ONGs', '/entrar'],
      ['Privacidade', '/privacidade'],
      ['Termos', '/termos'],
      ['Créditos das fotos', '/sobre-a-demo'],
    ]);
  });

  it('é verde-mata escuro e os links têm alvo de 44 px', () => {
    render(<SiteFooter className="extra" />);

    expect(screen.getByRole('contentinfo').className).toContain(
      'bg-brand-deep-pressed',
    );
    expect(screen.getByRole('contentinfo').className).toContain('extra');
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toContain('touch-target');
    }
  });

  it('mostra o conteúdo extra recebido', () => {
    render(<SiteFooter extra={<button type="button">Tema</button>} />);

    expect(
      within(screen.getByRole('contentinfo')).getByRole('button', {
        name: 'Tema',
      }),
    ).toBeInTheDocument();
  });
});
