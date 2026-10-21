import { render, screen } from '@testing-library/react';
import NgoNotFound from './not-found';

describe('/ong/[slug] não encontrada', () => {
  it('NGO-11: "ONG não encontrada" com um link para o mapa', () => {
    render(<NgoNotFound />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'ONG não encontrada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver o mapa de ONGs' }),
    ).toHaveAttribute('href', '/mapa');
  });
});
