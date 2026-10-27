import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity, useEffect, useState } from 'react';
import type { PinPickerProps } from '@/components/ui/pin-picker.client';
import type {
  AddressFieldsValues,
  CepLookupResult,
  GeocodeAddressResult,
} from '../ngo-account.types';
import {
  AddressFields,
  type AddressFieldsProps,
} from './address-fields.client';

const EMPTY: AddressFieldsValues = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  uf: '',
  location: null,
};
const FOUND: CepLookupResult = {
  ok: true,
  address: {
    street: 'Rua Joaquim Távora',
    district: 'Vila Mariana',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.59,
    lng: -46.63,
  },
};
const CEP_NOT_FOUND: CepLookupResult = {
  ok: false,
  error: 'CEP não encontrado. Confira os números ou busque pela cidade.',
};
const CEP_UNAVAILABLE: CepLookupResult = {
  ok: false,
  error: 'Não conseguimos buscar o CEP agora. Tente pela cidade.',
};
const NOTICE =
  'Não conseguimos preencher o endereço pelo CEP. Preencha todos os campos abaixo.';

const pickers = vi.hoisted(() => ({
  last: null as PinPickerProps | null,
  mounts: 0,
}));

function FakePinPicker(props: PinPickerProps) {
  pickers.last = props;
  useEffect(() => {
    pickers.mounts += 1;
  }, []);
  return (
    <div data-testid="pin-picker">
      {props.notFound ? 'Arraste o pino até o local' : 'pino'}
      <button
        type="button"
        onClick={() => props.onConfirmedChange(props.position)}
      >
        Confirmar localização
      </button>
      <button type="button" onClick={() => props.onConfirmedChange(null)}>
        Mover
      </button>
    </div>
  );
}

interface Options {
  values?: Partial<AddressFieldsValues>;
  savedReadOnly?: boolean;
  /** An Error makes the Server Action call fail (network down). */
  cep?: CepLookupResult | Promise<CepLookupResult> | Error;
  geocode?: GeocodeAddressResult | Promise<GeocodeAddressResult> | Error;
  errors?: AddressFieldsProps['errors'];
}

function renderFields({
  values = {},
  savedReadOnly,
  cep = FOUND,
  geocode = { found: true, lat: -23.5869, lng: -46.6347 },
  errors,
}: Options = {}) {
  const lookupCep = vi.fn(async (_cep: string) => {
    if (cep instanceof Error) throw cep;
    return cep;
  });
  const geocodeAddress = vi.fn(async () => {
    if (geocode instanceof Error) throw geocode;
    return geocode;
  });
  const changes: Partial<AddressFieldsValues>[] = [];
  let current: AddressFieldsValues = { ...EMPTY, ...values };

  function Harness() {
    const [state, setState] = useState(current);
    current = state;
    return (
      <AddressFields
        values={state}
        onChange={(patch) => {
          changes.push(patch);
          setState((s) => ({ ...s, ...patch }));
        }}
        errors={errors}
        idPrefix="address"
        lookupCep={lookupCep}
        geocodeAddress={geocodeAddress}
        PinPicker={FakePinPicker}
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        savedReadOnly={savedReadOnly}
      />
    );
  }

  render(<Harness />);
  return { lookupCep, geocodeAddress, changes, values: () => current };
}

const field = (label: string) => screen.getByLabelText(label);
const typeCep = (value: string) => userEvent.type(field('CEP'), value);

beforeEach(() => {
  pickers.last = null;
  pickers.mounts = 0;
});

describe('AddressFields', () => {
  it('SIGN-17: um CEP válido preenche logradouro, bairro, cidade e UF', async () => {
    const { lookupCep } = renderFields();

    await typeCep('04015012');

    expect(field('CEP')).toHaveValue('04015-012');
    expect(lookupCep).toHaveBeenCalledWith('04015012');
    await waitFor(() =>
      expect(field('Logradouro')).toHaveValue('Rua Joaquim Távora'),
    );
    expect(field('Bairro')).toHaveValue('Vila Mariana');
    expect(field('Cidade')).toHaveValue('São Paulo');
    expect(field('UF')).toHaveValue('SP');
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('antes da busca pelo CEP, logradouro, bairro, cidade e UF ficam travados', () => {
    renderFields();

    expect(field('Logradouro')).toHaveAttribute('readonly');
    expect(field('Bairro')).toHaveAttribute('readonly');
    expect(field('Cidade')).toHaveAttribute('readonly');
    expect(field('UF')).toBeDisabled();
    expect(field('Número')).not.toHaveAttribute('readonly');
  });

  it.each([
    ['404 (CEP não encontrado)', CEP_NOT_FOUND],
    ['503 (serviço de CEP fora)', CEP_UNAVAILABLE],
  ])(
    'SIGN-18: %s libera todos os campos com o aviso',
    async (_name, result) => {
      renderFields({ cep: result });

      await typeCep('99999999');

      expect(await screen.findByText(NOTICE)).toBeVisible();
      for (const label of ['Logradouro', 'Número', 'Bairro', 'Cidade']) {
        expect(field(label)).not.toHaveAttribute('readonly');
      }
      expect(field('UF')).toBeEnabled();
      expect(field('CEP')).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('address-cep-notice'),
      );
      await userEvent.type(field('Logradouro'), 'Rua Manual');
      expect(field('Logradouro')).toHaveValue('Rua Manual');
    },
  );

  it('SIGN-18: um erro de rede na busca do CEP também libera os campos', async () => {
    renderFields({ cep: new Error('offline') });

    await typeCep('04015012');

    expect(await screen.findByText(NOTICE)).toBeVisible();
    expect(field('Logradouro')).not.toHaveAttribute('readonly');
  });

  it('SIGN-19: o endereço completo é geocodificado e mostra o PinPicker na posição', async () => {
    const { geocodeAddress } = renderFields({ values: { number: '1240' } });

    await typeCep('04015012');

    expect(await screen.findByTestId('pin-picker')).toHaveTextContent('pino');
    expect(geocodeAddress).toHaveBeenCalledWith({
      street: 'Rua Joaquim Távora',
      number: '1240',
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
    });
    expect(pickers.last).toMatchObject({
      position: [-23.5869, -46.6347],
      notFound: false,
      tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
    });
  });

  it('SIGN-19: sem número, não geocodifica; ao sair do número, geocodifica', async () => {
    const { geocodeAddress } = renderFields();

    await typeCep('04015012');
    await waitFor(() => expect(field('Cidade')).toHaveValue('São Paulo'));
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(
      screen.getByText('Complete o endereço para ver o pino no mapa.'),
    ).toBeVisible();

    await userEvent.type(field('Número'), '1240');
    await userEvent.tab();

    expect(await screen.findByTestId('pin-picker')).toBeVisible();
    expect(geocodeAddress).toHaveBeenCalledTimes(1);
    // Same address on the next blur: no second call.
    await userEvent.click(field('Número'));
    await userEvent.tab();
    expect(geocodeAddress).toHaveBeenCalledTimes(1);
  });

  it('SIGN-20: endereço não achado → mapa no centro da cidade e "Arraste o pino até o local"', async () => {
    renderFields({
      values: { number: '1240' },
      geocode: { found: false, lat: -23.5329, lng: -46.6395 },
    });

    await typeCep('04015012');

    expect(await screen.findByTestId('pin-picker')).toHaveTextContent(
      'Arraste o pino até o local',
    );
    expect(pickers.last?.position).toEqual([-23.5329, -46.6395]);
  });

  it('SIGN-20: sem a cidade no geocoder, o pino parte do ponto do CEP', async () => {
    renderFields({
      values: { number: '1240' },
      geocode: { found: false, lat: null, lng: null },
    });

    await typeCep('04015012');

    expect(await screen.findByTestId('pin-picker')).toBeVisible();
    expect(pickers.last).toMatchObject({
      position: [-23.59, -46.63],
      notFound: true,
    });
  });

  it('sem nenhum ponto para o mapa, pede para conferir o endereço', async () => {
    renderFields({
      values: { number: '1240' },
      cep: CEP_NOT_FOUND,
      geocode: new Error('offline'),
    });

    await typeCep('04015012');
    await userEvent.type(field('Logradouro'), 'Rua Manual');
    await userEvent.type(field('Bairro'), 'Centro');
    await userEvent.type(field('Cidade'), 'Lugar Nenhum');
    await userEvent.selectOptions(field('UF'), 'SP');

    expect(
      await screen.findByText(
        'Não encontramos este endereço no mapa. Confira os dados do endereço.',
      ),
    ).toBeVisible();
    expect(screen.queryByTestId('pin-picker')).not.toBeInTheDocument();
  });

  it('SIGN-21/22: "Confirmar localização" grava a posição do pino com a data; mover desfaz', async () => {
    const { values } = renderFields({ values: { number: '1240' } });
    await typeCep('04015012');
    await screen.findByTestId('pin-picker');
    expect(values().location).toBeNull();

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar localização' }),
    );

    expect(values().location).toEqual({
      lat: -23.5869,
      lng: -46.6347,
      confirmedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Mover' }));
    expect(values().location).toBeNull();
  });

  it('PROF-03: mudar o endereço depois de confirmar desfaz a confirmação e esconde o pino', async () => {
    const { values } = renderFields({ values: { number: '1240' } });
    await typeCep('04015012');
    await screen.findByTestId('pin-picker');
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar localização' }),
    );

    await userEvent.type(field('Número'), '0');

    expect(values().location).toBeNull();
    expect(screen.queryByTestId('pin-picker')).not.toBeInTheDocument();
  });

  it('o complemento não muda o lugar: mantém o pino confirmado', async () => {
    const { values } = renderFields({ values: { number: '1240' } });
    await typeCep('04015012');
    await screen.findByTestId('pin-picker');
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar localização' }),
    );

    await userEvent.type(field('Complemento (opcional)'), 'Sala 2');

    expect(values().location).not.toBeNull();
    expect(screen.getByTestId('pin-picker')).toBeVisible();
  });

  it('SIGN-02: voltar à etapa mostra o pino salvo, sem geocodificar de novo', async () => {
    const { geocodeAddress } = renderFields({
      values: {
        cep: '04015-012',
        street: 'Rua Joaquim Távora',
        number: '1240',
        district: 'Vila Mariana',
        city: 'São Paulo',
        uf: 'SP',
        location: {
          lat: -23.58,
          lng: -46.63,
          confirmedAt: '2026-10-20T12:00:00.000Z',
        },
      },
    });

    expect(screen.getByTestId('pin-picker')).toBeVisible();
    expect(pickers.last?.position).toEqual([-23.58, -46.63]);
    expect(field('Logradouro')).not.toHaveAttribute('readonly');
    await userEvent.click(field('Número'));
    await userEvent.tab();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  describe('savedReadOnly (perfil)', () => {
    const SAVED_VALUES = {
      cep: '04015-012',
      street: 'Rua Joaquim Távora',
      number: '1240',
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
      location: {
        lat: -23.58,
        lng: -46.63,
        confirmedAt: '2026-10-20T12:00:00.000Z',
      },
    };

    it('DEP-60: o pino da localização cadastrada fica somente leitura', () => {
      renderFields({ values: SAVED_VALUES, savedReadOnly: true });

      expect(pickers.last?.readOnly).toBe(true);
      expect(pickers.last?.position).toEqual([-23.58, -46.63]);
    });

    it('DEP-61: mudar o endereço traz de volta o pino editável', async () => {
      renderFields({ values: SAVED_VALUES, savedReadOnly: true });

      await userEvent.clear(field('Número'));
      await userEvent.type(field('Número'), '1300');
      await userEvent.tab();

      expect(await screen.findByTestId('pin-picker')).toBeVisible();
      expect(pickers.last?.position).toEqual([-23.5869, -46.6347]);
      expect(pickers.last?.readOnly).toBe(false);
    });

    it('sem savedReadOnly (cadastro), o pino salvo continua editável', () => {
      renderFields({ values: SAVED_VALUES });

      expect(pickers.last?.readOnly).toBe(false);
    });
  });

  it('um CEP digitado de novo durante a busca descarta a resposta antiga', async () => {
    let answer!: (result: CepLookupResult) => void;
    renderFields({ cep: new Promise((resolve) => (answer = resolve)) });

    await typeCep('04015012');
    expect(screen.getByText('Buscando o endereço pelo CEP…')).toBeVisible();
    fireEvent.change(field('CEP'), { target: { value: '0401501' } });
    await act(async () => answer(FOUND));

    expect(field('Logradouro')).toHaveValue('');
    expect(field('Logradouro')).toHaveAttribute('readonly');
  });

  it('SIGN-19: o número digitado enquanto o CEP é buscado entra na geocodificação', async () => {
    let answer!: (result: CepLookupResult) => void;
    const { geocodeAddress } = renderFields({
      cep: new Promise((resolve) => (answer = resolve)),
    });

    await typeCep('04015012');
    await userEvent.type(field('Número'), '1240');
    await userEvent.tab();
    await act(async () => answer(FOUND));

    expect(await screen.findByTestId('pin-picker')).toBeVisible();
    expect(geocodeAddress).toHaveBeenCalledWith(
      expect.objectContaining({ number: '1240', street: 'Rua Joaquim Távora' }),
    );
  });

  it('uma letra no CEP não muda a máscara nem dispara a busca', async () => {
    const { lookupCep, changes } = renderFields({
      values: { cep: '04015-012' },
    });

    await userEvent.type(field('CEP'), 'a');

    expect(field('CEP')).toHaveValue('04015-012');
    expect(lookupCep).not.toHaveBeenCalled();
    expect(changes).toEqual([]);
  });

  it('SIGN-20: CEP sem coordenada e geocoder sem resultado → pede para conferir o endereço', async () => {
    renderFields({
      values: { number: '1240' },
      cep: { ok: true, address: { ...FOUND.address, lat: null, lng: null } },
      geocode: { found: false, lat: null, lng: null },
    });

    await typeCep('04015012');

    expect(
      await screen.findByText(
        'Não encontramos este endereço no mapa. Confira os dados do endereço.',
      ),
    ).toBeVisible();
    expect(screen.queryByTestId('pin-picker')).not.toBeInTheDocument();
  });

  it('uma resposta do geocoder para um endereço já mudado é descartada', async () => {
    let answer!: (result: GeocodeAddressResult) => void;
    renderFields({
      values: { number: '1240' },
      geocode: new Promise((resolve) => (answer = resolve)),
    });
    await typeCep('04015012');
    expect(
      await screen.findByText('Procurando o endereço no mapa…'),
    ).toBeVisible();

    await userEvent.type(field('Número'), '0');
    await act(async () => answer({ found: true, lat: -23.5, lng: -46.6 }));

    expect(screen.queryByTestId('pin-picker')).not.toBeInTheDocument();
  });

  it('A11Y-05: mostra o erro no campo, com aria-invalid e aria-describedby', () => {
    renderFields({
      errors: {
        cep: 'Digite os 8 números do CEP.',
        number: 'Informe o número (até 10 caracteres).',
        uf: 'Escolha a UF.',
        location: 'Confirme a localização no mapa para continuar.',
      },
    });

    expect(field('Número')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Número')).toHaveAccessibleDescription(
      'Informe o número (até 10 caracteres).',
    );
    expect(field('UF')).toHaveAccessibleDescription('Escolha a UF.');
    expect(field('CEP')).toHaveAttribute('aria-invalid', 'true');
    expect(field('CEP')).toHaveAccessibleDescription(
      'Digite os 8 números do CEP. Preenchemos o resto do endereço pelo CEP.',
    );
    expect(field('Logradouro')).not.toHaveAttribute('aria-invalid');
    expect(
      screen.getByText('Confirme a localização no mapa para continuar.'),
    ).toBeVisible();
    expect(document.getElementById('address-location')).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('escondida pelo <Activity> do Next, a etapa desmonta o mapa e monta um novo ao voltar', () => {
    const SAVED = {
      ...EMPTY,
      cep: '04015-012',
      street: 'Rua Joaquim Távora',
      number: '1240',
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
      location: {
        lat: -23.58,
        lng: -46.63,
        confirmedAt: '2026-10-20T12:00:00.000Z',
      },
    };
    const view = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <AddressFields
          values={SAVED}
          onChange={vi.fn()}
          idPrefix="address"
          lookupCep={vi.fn()}
          geocodeAddress={vi.fn()}
          PinPicker={FakePinPicker}
          tileUrl="http://tiles.test/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
      </Activity>
    );
    const { rerender } = render(view('visible'));
    expect(pickers.mounts).toBe(1);

    rerender(view('hidden'));
    expect(screen.queryByTestId('pin-picker')).not.toBeInTheDocument();
    rerender(view('visible'));

    expect(screen.getByTestId('pin-picker')).toBeInTheDocument();
    expect(pickers.mounts).toBe(2);
  });
});
