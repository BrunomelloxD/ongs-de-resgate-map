import { render, screen } from '@testing-library/react';
import AnimalNotFound from './not-found';

describe('/ong/[slug]/animais/[id] não encontrado', () => {
  it('ANI-06: página 404 com um link para o mapa', () => {
    render(<AnimalNotFound />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Animal não encontrado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver o mapa de ONGs' }),
    ).toHaveAttribute('href', '/mapa');
  });
});
