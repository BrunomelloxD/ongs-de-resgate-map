import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCepAddress, makeCity } from '../test-fixtures';
import type { LookupCepResult } from '../location.types';
import {
  LocationPicker,
  type LocationPickerProps,
} from './location-picker.client';

const REACTIVATE =
  'Sem problema. Para ativar depois, toque no cadeado ao lado do endereço do site e permita “Localização”.';
const SANTA_CRUZ = makeCity({
  id: 2411205,
  name: 'Santa Cruz',
  uf: 'RN',
  lat: -6.2295,
  lng: -36.0228,
});

type Success = PositionCallback;
type Failure = PositionErrorCallback;

function fakeGeolocation() {
  const geo = {
    getCurrentPosition:
      vi.fn<
        (ok: Success, fail?: Failure | null, options?: PositionOptions) => void
      >(),
  };
  const succeed = (lat: number, lng: number) =>
    geo.getCurrentPosition.mock.calls[0]![0]({
      coords: { latitude: lat, longitude: lng },
    } as GeolocationPosition);
  const fail = (code: number) =>
    geo.getCurrentPosition.mock.calls[0]![1]!({
      code,
    } as GeolocationPositionError);
  return { geo, succeed, fail };
}

function setup(props: Partial<LocationPickerProps> = {}) {
  const navigate = vi.fn();
  const lookupCep = vi.fn<(cep: string) => Promise<LookupCepResult>>(
    async () => ({ ok: true, address: makeCepAddress() }),
  );
  const searchCities = vi.fn(async () => [SANTA_CRUZ]);
  const { geo, succeed, fail } = fakeGeolocation();
  render(
    <LocationPicker
      geolocation={geo}
      lookupCep={lookupCep}
      navigate={navigate}
      searchCities={searchCities}
      {...props}
    />,
  );
  return { user: userEvent.setup(), navigate, lookupCep, geo, succeed, fail };
}

const useLocation = () =>
  screen.getByRole('button', { name: 'Usar minha localização' });

describe('LocationPicker', () => {
  it('LOC-01: explica o motivo, que o dado não é guardado e oferece a busca manual', () => {
    setup();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Onde você está?' }),
    ).toBeVisible();
    expect(
      screen.getByText('Só para centralizar o mapa nas ONGs perto de você.'),
    ).toBeVisible();
    expect(
      screen.getByText('Não salvamos sua posição nem mostramos para as ONGs.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Buscar pela cidade ou CEP' }),
    ).toBeVisible();
  });

  it('LOC-01/LOC-03: ao montar, nenhuma chamada a getCurrentPosition', () => {
    const { geo } = setup();

    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('LOC-02: o toque chama getCurrentPosition uma vez, com timeout de 10 s', async () => {
    const { user, geo } = setup();

    await user.click(useLocation());

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geo.getCurrentPosition.mock.calls[0]![2]).toEqual({
      timeout: 10000,
    });
    expect(
      screen.getByRole('button', { name: 'Procurando sua localização…' }),
    ).toBeDisabled();
  });

  it('LOC-04: posição obtida → navega para /mapa com o centro no fragmento', async () => {
    const { user, navigate, succeed } = setup();

    await user.click(useLocation());
    succeed(-23.5869, -46.6347);

    expect(navigate).toHaveBeenCalledWith('/mapa#c=-23.5869,-46.6347&r=5');
  });

  it('LOC-05: PERMISSION_DENIED → busca manual com a instrução de reativar', async () => {
    const { user, fail } = setup();

    await user.click(useLocation());
    fail(1);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A localização está bloqueada');
    expect(alert).toHaveTextContent(REACTIVATE);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Busque pela cidade ou CEP',
    });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'CEP' })).toBeVisible();
  });

  it.each([
    ['TIMEOUT', 3],
    ['POSITION_UNAVAILABLE', 2],
  ])(
    'LOC-06: %s → busca manual sem a instrução de reativar',
    async (_name, code) => {
      const { user, fail } = setup();

      await user.click(useLocation());
      fail(code);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não encontramos sua localização',
      );
      expect(screen.queryByText(REACTIVATE)).not.toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Cidade' })).toBeVisible();
    },
  );

  it('LOC-06: sem a API de geolocalização → busca manual sem a instrução', async () => {
    const { user } = setup({ geolocation: undefined });

    await user.click(useLocation());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não encontramos sua localização',
    );
    expect(screen.queryByText(REACTIVATE)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toBeVisible();
  });

  it('LOC-03: "Tentar de novo" chama getCurrentPosition de novo', async () => {
    const { user, geo, fail } = setup();

    await user.click(useLocation());
    fail(3);
    await user.click(
      await screen.findByRole('button', { name: 'Tentar de novo' }),
    );

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('"Buscar pela cidade ou CEP" abre a busca manual sem aviso e sem pedir a localização', async () => {
    const { user, geo } = setup();

    await user.click(
      screen.getByRole('button', { name: 'Buscar pela cidade ou CEP' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Busque pela cidade ou CEP' }),
    ).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    await user.click(useLocation());
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('LOC-08: escolher um município navega com as coordenadas dele', async () => {
    const { user, navigate } = setup({ initialPhase: 'manual' });

    await user.type(screen.getByRole('combobox', { name: 'Cidade' }), 'santa');
    await user.click(
      await screen.findByRole('option', { name: 'Santa Cruz, RN' }),
    );

    expect(navigate).toHaveBeenCalledWith('/mapa#c=-6.2295,-36.0228&r=5');
  });

  it('LOC-09: CEP válido navega com o ponto do CEP', async () => {
    const { user, navigate, lookupCep } = setup({ initialPhase: 'manual' });

    await user.type(screen.getByRole('textbox', { name: 'CEP' }), '01310100');
    expect(screen.getByRole('textbox', { name: 'CEP' })).toHaveValue(
      '01310-100',
    );
    await user.click(screen.getByRole('button', { name: 'Buscar CEP' }));

    expect(lookupCep).toHaveBeenCalledWith('01310-100');
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/mapa#c=-23.5613,-46.6565&r=5'),
    );
  });

  it('LOC-10: CEP inexistente mostra a mensagem no campo e fica na tela', async () => {
    const message =
      'CEP não encontrado. Confira os números ou busque pela cidade.';
    const { user, navigate } = setup({
      initialPhase: 'manual',
      lookupCep: vi.fn(async () => ({ ok: false as const, error: message })),
    });
    const field = screen.getByRole('textbox', { name: 'CEP' });

    await user.type(field, '00000000');
    await user.click(screen.getByRole('button', { name: 'Buscar CEP' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(message);
    expect(navigate).not.toHaveBeenCalled();

    await user.type(field, '1');
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('enquanto busca o CEP, o botão fica desabilitado com "Buscando…"', async () => {
    let finish: (result: LookupCepResult) => void = () => {};
    const { user } = setup({
      initialPhase: 'manual',
      lookupCep: () => new Promise((resolve) => (finish = resolve)),
    });

    await user.type(screen.getByRole('textbox', { name: 'CEP' }), '01310100');
    await user.click(screen.getByRole('button', { name: 'Buscar CEP' }));

    expect(screen.getByRole('button', { name: 'Buscando…' })).toBeDisabled();
    finish({ ok: false, error: 'x' });
    expect(
      await screen.findByRole('button', { name: 'Buscar CEP' }),
    ).toBeEnabled();
  });

  it('CEP sem coordenada mostra a mensagem do LOC-11 e não navega', async () => {
    const { user, navigate } = setup({
      initialPhase: 'manual',
      lookupCep: vi.fn(async () => ({
        ok: true as const,
        address: makeCepAddress({ lat: null, lng: null }),
      })),
    });

    await user.type(screen.getByRole('textbox', { name: 'CEP' }), '01310100');
    await user.click(screen.getByRole('button', { name: 'Buscar CEP' }));

    expect(
      await screen.findByText(
        'Não conseguimos buscar o CEP agora. Tente pela cidade.',
      ),
    ).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('aberto direto num estado de aviso, não rouba o foco', () => {
    setup({ initialPhase: 'denied' });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText(REACTIVATE)).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Busque pela cidade ou CEP' }),
    ).not.toHaveFocus();
  });
});
