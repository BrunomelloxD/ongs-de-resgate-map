import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { LOCAL_IMAGE_URL, makeNgoAnimal } from '../test-fixtures';
import { AnimalCard } from './animal-card';

const cover = {
  ...makeNgoAnimal().cover!,
  url: LOCAL_IMAGE_URL,
  thumbUrl: LOCAL_IMAGE_URL,
};

const meta = {
  title: 'NgoPage/AnimalCard',
  component: AnimalCard,
  args: {
    animal: makeNgoAnimal({ cover }),
    href: '/ong/patas-do-bairro/animais/1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f',
  },
  decorators: [
    (Story) => (
      <div className="max-w-60">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnimalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('img', { name: 'Mel, gato, porte pequeno' }),
    ).toHaveAttribute('loading', 'lazy');
  },
};

export const Unavailable: Story = {
  args: { animal: makeNgoAnimal({ cover, available: false }) },
};

export const WithoutCover: Story = {
  args: { animal: makeNgoAnimal({ cover: null }) },
};
