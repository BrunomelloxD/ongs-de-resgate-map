import { render, screen } from '@testing-library/react';
import { NgoListCard } from './ngo-list-card';

describe('NgoListCard', () => {
  it('mostra a foto, o nome, o selo, a distância e o horário de hoje', () => {
    render(
      <NgoListCard
        thumb={<img src="/x.webp" alt="" />}
        name="Patas do Bairro"
        openNow
        distance="1,2 km"
        hours="Hoje, 9h às 18h"
      />,
    );

    expect(screen.getByText('Patas do Bairro')).toBeVisible();
    expect(screen.getByText('Aberta agora')).toBeVisible();
    expect(screen.getByText('1,2 km')).toBeVisible();
    expect(screen.getByText('Hoje, 9h às 18h')).toBeVisible();
    expect(document.querySelector('img')).toHaveAttribute('src', '/x.webp');
  });

  it('a ONG fechada leva o selo "Fechada"', () => {
    render(
      <NgoListCard
        thumb={null}
        name="Recanto"
        openNow={false}
        hours="Fechada hoje"
        className="extra"
      />,
    );

    expect(screen.getByText('Fechada')).toBeVisible();
    expect(document.querySelector('[data-slot="ngo-list-card"]')).toHaveClass(
      'extra',
    );
  });
});
