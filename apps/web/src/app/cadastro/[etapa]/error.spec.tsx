import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupError from './error';

describe('/cadastro/[etapa] com erro', () => {
  it('mostra a falha e "Tentar novamente" chama retry()', async () => {
    const retry = vi.fn();
    render(<SignupError retry={retry} />);

    expect(
      screen.getByRole('heading', {
        name: 'Não conseguimos abrir o cadastro.',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
