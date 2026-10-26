import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import { LOCAL_IMAGE_URL, makeAnimal, makeImages } from '../test-fixtures';
import { AnimalDetail } from './animal-detail';

const images = makeImages(3).map((image) => ({
  ...image,
  url: LOCAL_IMAGE_URL,
  thumbUrl: LOCAL_IMAGE_URL,
}));
const base = makeAnimal({ images });
const ngo = { ...base.ngo, imageUrl: LOCAL_IMAGE_URL };

const meta = {
  title: 'AnimalPage/AnimalDetail',
  component: AnimalDetail,
  args: { animal: { ...base, ngo } },
} satisfies Meta<typeof AnimalDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AvailableMale: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Quero adotar o Caramelo' }),
    ).toHaveAttribute('href', base.whatsappUrl);
  },
};

export const AvailableFemale: Story = {
  args: {
    animal: {
      ...base,
      ngo,
      name: 'Mel',
      sex: 'FEMALE',
      species: 'CAT',
      size: 'SMALL',
      images: makeImages(1, 'Mel, gato, porte pequeno').map((image) => ({
        ...image,
        url: LOCAL_IMAGE_URL,
        thumbUrl: LOCAL_IMAGE_URL,
      })),
    },
  },
};

export const Unavailable: Story = {
  args: {
    animal: { ...base, ngo, available: false, whatsappUrl: null },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Quero adotar o Caramelo' }),
    ).toBeDisabled();
  },
};

/** SHARE-01: the "Compartilhar" button, as the public page shows it. */
export const WithShare: Story = {
  args: {
    share: {
      title: 'Caramelo · Patas do Bairro',
      text: 'Resgatamos cães e gatos.',
      url: 'https://animalhelper.example/ong/patas-do-bairro/animais/1',
    },
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <Story />
      </LiveRegion>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Compartilhar' }),
    ).toBeVisible();
  },
};
