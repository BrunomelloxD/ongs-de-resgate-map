import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PinPicker } from '@/components/ui/pin-picker.client';
import type {
  AddressFieldsValues,
  CepLookupResult,
  GeocodeAddressResult,
} from '../ngo-account.types';
import {
  AddressFields,
  type AddressFieldsProps,
} from './address-fields.client';

// Plain tile drawn locally: stories never fetch real tiles. A picture, not a theme colour.
const STORY_TILE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="linen"/><path d="M0 128H256M128 0V256" stroke="wheat" stroke-width="10"/></svg>',
)}`;

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
const SAVED: AddressFieldsValues = {
  cep: '04015-012',
  street: 'Rua Joaquim Távora',
  number: '1240',
  complement: '',
  district: 'Vila Mariana',
  city: 'São Paulo',
  uf: 'SP',
  location: {
    lat: -23.5869,
    lng: -46.6347,
    confirmedAt: '2026-10-20T12:00:00.000Z',
  },
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

const cepAnswer = (result: CepLookupResult) =>
  fn(async (_cep: string) => result);
const geocodeAnswer = (result: GeocodeAddressResult) => fn(async () => result);

/** Keeps the values like the SignupProvider does. */
function Stateful(props: AddressFieldsProps) {
  const [values, setValues] = useState(props.values);
  return (
    <AddressFields
      {...props}
      values={values}
      onChange={(patch) => {
        props.onChange(patch);
        setValues((v) => ({ ...v, ...patch }));
      }}
    />
  );
}

const meta = {
  title: 'NgoAccount/AddressFields',
  component: AddressFields,
  args: {
    values: EMPTY,
    onChange: fn(),
    idPrefix: 'address',
    lookupCep: cepAnswer(FOUND),
    geocodeAddress: geocodeAnswer({
      found: true,
      lat: -23.5869,
      lng: -46.6347,
    }),
    PinPicker,
    tileUrl: STORY_TILE_URL,
    attribution: '© OpenStreetMap contributors',
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddressFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Logradouro')).toHaveAttribute(
      'readonly',
    );
    await expect(
      canvas.getByText('Complete o endereço para ver o pino no mapa.'),
    ).toBeVisible();
  },
};

export const CepFound: Story = {
  args: { values: { ...EMPTY, number: '1240' } },
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('CEP'), '04015012');
    await waitFor(() =>
      expect(canvas.getByLabelText('Logradouro')).toHaveValue(
        'Rua Joaquim Távora',
      ),
    );
    await expect(canvas.getByLabelText('UF')).toHaveValue('SP');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Confirmar localização' }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({
      location: expect.objectContaining({ lat: -23.5869, lng: -46.6347 }),
    });
  },
};

export const CepNotFound: Story = {
  args: {
    lookupCep: cepAnswer({
      ok: false,
      error: 'CEP não encontrado. Confira os números ou busque pela cidade.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('CEP'), '99999999');
    await expect(
      await canvas.findByText(
        'Não conseguimos preencher o endereço pelo CEP. Preencha todos os campos abaixo.',
      ),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Logradouro')).not.toHaveAttribute(
      'readonly',
    );
    await expect(canvas.getByLabelText('UF')).toBeEnabled();
  },
};

export const AddressNotFound: Story = {
  args: {
    values: { ...EMPTY, number: '1240' },
    geocodeAddress: geocodeAnswer({
      found: false,
      lat: -23.5329,
      lng: -46.6395,
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('CEP'), '04015012');
    await expect(
      await canvas.findByText('Arraste o pino até o local'),
    ).toBeVisible();
  },
};

export const Saved: Story = {
  args: { values: SAVED },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', {
        name: 'Pino da ONG, arraste até o local',
      }),
    ).toBeVisible();
  },
};

export const WithErrors: Story = {
  args: {
    errors: {
      cep: 'Digite os 8 números do CEP.',
      number: 'Informe o número (até 10 caracteres).',
      location: 'Confirme a localização no mapa para continuar.',
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('CEP')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(
      canvas.getByText('Confirme a localização no mapa para continuar.'),
    ).toBeVisible();
  },
};
