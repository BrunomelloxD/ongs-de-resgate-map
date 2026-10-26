import { render, screen } from '@testing-library/react';
import { NgoIdentity } from './ngo-identity';

describe('NgoIdentity', () => {
  it('mostra a imagem da ONG recortada em pino, o nome e o e-mail (barra lateral)', () => {
    const { container } = render(
      <NgoIdentity
        tone="sidebar"
        name="Patas do Bairro"
        detail="contato@patas.org"
        imageUrl="/img/logo.webp"
      />,
    );
    const pin = container.querySelector('[data-slot="pin-photo"]')!;

    expect(pin).toHaveStyle({ width: '40px', height: '52px' });
    expect(pin.querySelector('img')).toHaveAttribute('src', '/img/logo.webp');
    expect(pin.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.getByText('Patas do Bairro')).toHaveClass(
      'text-on-brand-deep',
    );
    expect(screen.getByText('contato@patas.org')).toBeInTheDocument();
  });

  it('sem imagem, a pata no pino; no cabeçalho do celular, 32 px e "Área da ONG"', () => {
    const { container } = render(
      <NgoIdentity
        tone="header"
        name="Patas do Bairro"
        detail="Área da ONG"
        imageUrl={null}
        className="extra"
      />,
    );
    const pin = container.querySelector('[data-slot="pin-photo"]')!;

    expect(pin).toHaveStyle({ width: '32px' });
    expect(pin.querySelector('img')).toBeNull();
    expect(pin.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Patas do Bairro')).toHaveClass('text-fg');
    expect(screen.getByText('Área da ONG')).toBeInTheDocument();
    expect(container.firstElementChild!.className).toContain('extra');
  });
});
