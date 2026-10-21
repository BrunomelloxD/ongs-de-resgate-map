import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { ToggleAvailability } from '../dashboard.types';
import { LOCAL_IMAGE_URL, MIXED_ANIMALS } from '../test-fixtures';
import { AnimalList } from './animal-list.client';

const meta = {
  title: 'Dashboard/AnimalList',
  component: AnimalList,
  args: {
    animals: MIXED_ANIMALS.map((animal) => ({
      ...animal,
      images: animal.images.map((image) => ({
        ...image,
        url: LOCAL_IMAGE_URL,
        thumbUrl: LOCAL_IMAGE_URL,
      })),
    })),
    onToggle: fn<ToggleAvailability>(async () => ({ ok: true })),
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <div className="mx-auto max-w-xl">
          <Story />
        </div>
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof AnimalList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Search: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('searchbox', { name: 'Buscar' }),
      'joao',
    );
    const list = within(canvas.getByRole('list'));
    await expect(
      list.getAllByRole('heading').map((h) => h.textContent),
    ).toEqual(['João']);
  },
};

export const FilterCats: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Gatos' }));
    const list = within(canvas.getByRole('list'));
    await expect(
      list.getAllByRole('heading').map((h) => h.textContent),
    ).toEqual(['Mel', 'Joana']);
  },
};

export const NoResults: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('searchbox', { name: 'Buscar' }),
      'rex',
    );
    await expect(canvas.getByText('Nenhum animal encontrado.')).toBeVisible();
  },
};
