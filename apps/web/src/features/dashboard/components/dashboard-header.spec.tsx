import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader } from './dashboard-header';

describe('DashboardHeader', () => {
  it('mostra o nome da ONG e "Área da ONG"', () => {
    render(
      <DashboardHeader ngoName="Patas do Bairro" logoutAction={vi.fn()} />,
    );

    expect(screen.getByText('Patas do Bairro')).toBeInTheDocument();
    expect(screen.getByText('Área da ONG')).toBeInTheDocument();
  });

  it('AUTH-05: "Sair" envia o formulário para a action de logout', async () => {
    const logoutAction = vi.fn(async () => undefined);
    render(
      <DashboardHeader ngoName="Patas do Bairro" logoutAction={logoutAction} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(logoutAction).toHaveBeenCalledTimes(1);
  });
});
