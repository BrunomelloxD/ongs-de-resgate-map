import { fireEvent, render, screen } from '@testing-library/react';
import { BackLink } from './back-link.client';

function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', { value, configurable: true });
}

afterEach(() => setReferrer(''));

describe('BackLink', () => {
  it('é um link com nome para o destino de reserva', () => {
    render(<BackLink href="/" label="Voltar" className="extra" />);

    const link = screen.getByRole('link', { name: 'Voltar' });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveClass('extra', 'rounded-full');
  });

  it('vindo de uma página do site, volta no histórico (o mapa mantém a área)', () => {
    setReferrer(`${window.location.origin}/mapa`);
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(<BackLink href="/" label="Voltar" />);

    const event = fireEvent.click(screen.getByRole('link', { name: 'Voltar' }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(event).toBe(false);
    back.mockRestore();
  });

  it('aberto de fora (link compartilhado), segue o href', () => {
    setReferrer('https://wa.me/');
    const back = vi.spyOn(window.history, 'back');
    render(<BackLink href="/" label="Voltar" />);

    const event = fireEvent.click(screen.getByRole('link', { name: 'Voltar' }));

    expect(back).not.toHaveBeenCalled();
    expect(event).toBe(true);
  });

  it('sem referrer, segue o href', () => {
    const back = vi.spyOn(window.history, 'back');
    render(<BackLink href="/" label="Voltar" />);

    expect(fireEvent.click(screen.getByRole('link', { name: 'Voltar' }))).toBe(
      true,
    );
    expect(back).not.toHaveBeenCalled();
  });
});
