import { render, screen } from '@testing-library/react';
import MyAnimalNotFound from './not-found';

describe('/painel/animais/[id] não encontrado', () => {
  it('SEC-06/edge: "Animal não encontrado." com volta ao painel', () => {
    render(<MyAnimalNotFound />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Animal não encontrado.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para seus animais' }),
    ).toHaveAttribute('href', '/painel');
  });
});
