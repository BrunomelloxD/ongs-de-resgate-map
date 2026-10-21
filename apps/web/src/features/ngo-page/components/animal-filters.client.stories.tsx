import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { DEFAULT_ANIMAL_FILTERS } from '../animal-filters';
import { AnimalFilters } from './animal-filters.client';

const meta = {
  title: 'NgoPage/AnimalFilters',
  component: AnimalFilters,
  args: { value: DEFAULT_ANIMAL_FILTERS, onChange: fn() },
} satisfies Meta<typeof AnimalFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const toggle = canvas.getByRole('switch', { name: 'Só disponíveis' });
    await expect(toggle).toBeChecked();
    await userEvent.click(canvas.getByRole('button', { name: 'Cão' }));
    await expect(args.onChange).toHaveBeenLastCalledWith({
      species: 'DOG',
      available: true,
    });
  },
};

export const Combined: Story = {
  args: {
    value: { species: 'CAT', sex: 'FEMALE', size: 'SMALL', available: false },
  },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Limpar filtros' }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({ available: true });
  },
};
