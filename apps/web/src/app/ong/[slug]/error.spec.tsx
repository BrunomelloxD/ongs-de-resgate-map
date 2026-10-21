import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NgoError from './error';

describe('/ong/[slug] com erro', () => {
  it('mostra a falha e "Tentar novamente" chama retry()', async () => {
    const retry = vi.fn();
    render(<NgoError retry={retry} />);

    expect(
      screen.getByRole('heading', { name: 'Não conseguimos carregar a ONG.' }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
