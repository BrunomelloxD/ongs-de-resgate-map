import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lookupCep } from './actions/lookup-cep';
import { LocationPage } from './location-page.client';
import { makeCepAddress } from './test-fixtures';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./actions/lookup-cep', () => ({ lookupCep: vi.fn() }));

const getCurrentPosition = vi.fn((ok: PositionCallback) =>
  ok({
    coords: { latitude: -23.5, longitude: -46.6 },
  } as GeolocationPosition),
);

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
});

describe('LocationPage', () => {
  it('usa o navigator.geolocation do navegador e navega com router.push', async () => {
    render(<LocationPage />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Usar minha localização' }),
    );

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/mapa#c=-23.5,-46.6&r=5');
  });

  it('busca o CEP pela Server Action lookupCep', async () => {
    vi.mocked(lookupCep).mockResolvedValue({
      ok: true,
      address: makeCepAddress({ lat: -23.56, lng: -46.65 }),
    });
    render(<LocationPage />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar pela cidade ou CEP' }),
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'CEP' }),
      '01310100',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar CEP' }));

    expect(lookupCep).toHaveBeenCalledWith('01310-100');
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/mapa#c=-23.56,-46.65&r=5'),
    );
  });
});
