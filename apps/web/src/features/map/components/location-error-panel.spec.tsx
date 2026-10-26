import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationErrorPanel } from './location-error-panel';

describe('LocationErrorPanel', () => {
  it('MAP-15/M-15: ícone de erro, título, texto, "Tentar de novo" e a busca', async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <LocationErrorPanel onRetry={onRetry} search={<p>busca</p>} />,
    );

    expect(container.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Não encontramos sua localização',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'O GPS pode estar desligado ou o navegador bloqueou o acesso. Você ainda pode buscar pela cidade ou CEP.',
      ),
    ).toBeVisible();
    expect(screen.getByText('busca')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
