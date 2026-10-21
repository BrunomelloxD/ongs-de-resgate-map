import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { makeCity } from '../test-fixtures';
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
