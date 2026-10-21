import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimalError from './error';

describe('/ong/[slug]/animais/[id] com erro', () => {
  it('mostra a falha e "Tentar novamente" chama retry()', async () => {
    const retry = vi.fn();
    render(<AnimalError retry={retry} />);

    expect(
      screen.getByRole('heading', {
        name: 'Não conseguimos carregar o animal.',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
