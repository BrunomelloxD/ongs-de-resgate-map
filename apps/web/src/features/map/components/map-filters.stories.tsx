import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { DEFAULT_FILTERS, MapFilters } from './map-filters';

const meta = {
  title: 'Map/MapFilters',
  component: MapFilters,
  args: { value: DEFAULT_FILTERS, onChange: fn() },
} satisfies Meta<typeof MapFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Com gatos' }));
    await expect(args.onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      species: ['CAT'],
    });
  },
};

export const AllOn: Story = {
  args: { value: { openNow: true, radiusKm: 25, species: ['DOG', 'CAT'] } },
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Limpar filtros' }),
    );
    await expect(args.onChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  },
};
