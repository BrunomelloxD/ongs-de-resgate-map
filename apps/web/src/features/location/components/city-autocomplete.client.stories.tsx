import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { LookupCepResult } from '../location.types';
import { makeCepAddress, makeCity } from '../test-fixtures';
import { CityAutocomplete } from './city-autocomplete.client';

const CITIES = [
  makeCity({ id: 4216602, name: 'Santa Cruz do Sul', uf: 'RS' }),
  makeCity({ id: 2411205, name: 'Santa Cruz', uf: 'RN' }),
  makeCity({ id: 3546405, name: 'Santa Cruz do Rio Pardo', uf: 'SP' }),
];

const meta = {
  title: 'Location/CityAutocomplete',
  component: CityAutocomplete,
  args: {
    onSelect: fn(),
    search: fn(async () => CITIES),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CityAutocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Suggestions: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('combobox', { name: 'Cidade' });
    await userEvent.type(input, 'santa cruz');
    await waitFor(() => expect(canvas.getAllByRole('option')).toHaveLength(3));
    await expect(args.search).toHaveBeenCalledTimes(1);
  },
};

export const KeyboardSelection: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('combobox', { name: 'Cidade' });
    await userEvent.type(input, 'santa cruz');
    await waitFor(() => expect(canvas.getAllByRole('option')).toHaveLength(3));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await expect(args.onSelect).toHaveBeenCalledWith(CITIES[1]);
    await expect(input).toHaveValue('Santa Cruz – RN');
  },
};

export const NoResults: Story = {
  args: { search: fn(async () => []) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'xyzw');
    await expect(
      await canvas.findByText('Nenhuma cidade encontrada.'),
    ).toBeVisible();
  },
};

export const SearchError: Story = {
  args: {
    search: fn(async () => {
      throw new Error('offline');
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'santa');
    await expect(
      await canvas.findByText(
        'Não conseguimos buscar as cidades agora. Tente pelo CEP.',
      ),
    ).toBeVisible();
  },
};

/** T186: "Cidade ou CEP", with the CEP looked up into a suggestion (LOC-09). */
export const WithCep: Story = {
  args: {
    lookupCep: fn<(cep: string) => Promise<LookupCepResult>>(async () => ({
      ok: true,
      address: makeCepAddress({ district: 'Vila Mariana' }),
    })),
    onCep: fn(),
    submitLabel: 'Ver ONGs nesta região',
  },
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('combobox', { name: 'Cidade ou CEP' });
    await userEvent.type(input, '04101000');
    await userEvent.click(
      await canvas.findByRole('option', {
        name: '04101-000 Vila Mariana, São Paulo – SP',
      }),
    );
    await expect(args.onCep).toHaveBeenCalled();
  },
};

/** The map's error state (03-mapa-erro): outline "Buscar nesta cidade". */
export const WithCepNotFound: Story = {
  args: {
    lookupCep: fn<(cep: string) => Promise<LookupCepResult>>(async () => ({
      ok: false,
      error: 'CEP não encontrado. Confira os números ou busque pela cidade.',
    })),
    submitLabel: 'Buscar nesta cidade',
    submitVariant: 'outline',
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox'), '00000000');
    await expect(
      await canvas.findByText(
        'CEP não encontrado. Confira os números ou busque pela cidade.',
      ),
    ).toBeVisible();
  },
};
