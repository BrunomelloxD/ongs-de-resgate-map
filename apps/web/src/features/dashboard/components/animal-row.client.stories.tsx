import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { MyAnimal, ToggleAvailability } from '../dashboard.types';
import { LOCAL_IMAGE_URL, makeMyAnimal } from '../test-fixtures';
import { AnimalRow } from './animal-row.client';

const withLocalPhoto = (animal: MyAnimal): MyAnimal => ({
  ...animal,
  images: animal.images.map((image) => ({
    ...image,
    url: LOCAL_IMAGE_URL,
    thumbUrl: LOCAL_IMAGE_URL,
  })),
});

const meta = {
  title: 'Dashboard/AnimalRow',
  component: AnimalRow,
  args: {
    animal: withLocalPhoto(makeMyAnimal({ name: 'Mel', available: true })),
    onToggle: fn<ToggleAvailability>(async () => ({ ok: true })),
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <ul className="mx-auto max-w-xl">
          <Story />
        </ul>
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof AnimalRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {};

export const Unavailable: Story = {
  args: {
    animal: withLocalPhoto(
      makeMyAnimal({
        name: 'Caramelo',
        species: 'DOG',
        sex: 'MALE',
        size: 'MEDIUM',
        available: false,
      }),
    ),
  },
};

export const WithoutPhoto: Story = {
  args: { animal: makeMyAnimal({ name: 'Pipoca', images: [] }) },
};

export const ToggleSaved: Story = {
  play: async ({ canvas, args }) => {
    const toggle = canvas.getByRole('switch', {
      name: 'Disponível para adoção: Mel',
    });
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        canvas.getByText('Mel agora está indisponível.'),
      ).toBeInTheDocument(),
    );
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(args.onToggle).toHaveBeenCalledWith(args.animal.id, false);
  },
};

export const ToggleFailed: Story = {
  args: { onToggle: fn<ToggleAvailability>(async () => ({ ok: false })) },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('switch', {
      name: 'Disponível para adoção: Mel',
    });
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        canvas.getAllByText('Não foi possível salvar. Tente de novo.'),
      ).toHaveLength(2),
    );
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  },
};
