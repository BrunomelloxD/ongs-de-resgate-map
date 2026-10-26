import { render, screen } from '@testing-library/react';
import { AccountDeletedContainer } from './account-deleted.container';

const renderWith = async (params: Record<string, string | string[]>) =>
  render(
    (await AccountDeletedContainer({
      searchParams: Promise.resolve(params),
    })) ?? <></>,
  );

describe('AccountDeletedContainer', () => {
  it('PROF-08: ?conta=excluida mostra "Conta excluída."', async () => {
    await renderWith({ conta: 'excluida' });

    expect(screen.getByRole('status')).toHaveTextContent('Conta excluída.');
  });

  it('aceita o primeiro valor repetido', async () => {
    await renderWith({ conta: ['excluida', 'x'] });

    expect(screen.getByText('Conta excluída.')).toBeInTheDocument();
  });

  it('sem o parâmetro, não mostra nada', async () => {
    await renderWith({});

    expect(screen.queryByText('Conta excluída.')).not.toBeInTheDocument();
  });
});
