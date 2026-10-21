import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { LOCAL_IMAGE_URL, makeImages } from '../test-fixtures';
import { AnimalGallery } from './animal-gallery.client';

const local = (count: number) =>
  makeImages(count).map((image) => ({
    ...image,
    url: LOCAL_IMAGE_URL,
    thumbUrl: LOCAL_IMAGE_URL,
  }));

const meta = {
  title: 'AnimalPage/AnimalGallery',
  component: AnimalGallery,
  args: { images: local(3), name: 'Caramelo' },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnimalGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreePhotos: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('1/3')).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ver foto 3 de 3' }),
    );
    await expect(canvas.getByText('3/3')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvas.getByText('2/3')).toBeInTheDocument();
  },
};

export const OnePhoto: Story = {
  args: { images: local(1) },
};

export const NoPhotos: Story = {
  args: { images: [] },
};
