import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardError from './error';

describe('/painel com erro', () => {
  it('mostra a falha e "Tentar novamente" chama retry()', async () => {
    const retry = vi.fn();
    render(<DashboardError retry={retry} />);

    expect(
      screen.getByRole('heading', {
        name: 'Não conseguimos carregar seus animais.',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
