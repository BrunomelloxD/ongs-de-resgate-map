import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { Photo, UploadPhoto } from '../animal-form.types';
import { LOCAL_IMAGE_URL, makePhoto } from '../test-fixtures';
import { PhotoManager, type PhotoManagerProps } from './photo-manager.client';

const UPLOADED = {
  ok: true as const,
  id: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  thumbUrl: LOCAL_IMAGE_URL,
};

/** One-pixel PNG as a picked file. */
const pngFile = (name: string) =>
  new File(
    [
      Uint8Array.from(atob(LOCAL_IMAGE_URL.split(',')[1]!), (c) =>
        c.charCodeAt(0),
      ),
    ],
    name,
    { type: 'image/png' },
  );

function Stateful(props: PhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>(props.photos);
  return <PhotoManager {...props} photos={photos} onChange={setPhotos} />;
}

const three = () => [
  makePhoto(1, { alt: 'Caramelo deitado' }),
  makePhoto(2, { alt: 'Caramelo no parque' }),
  makePhoto(3, { alt: 'Caramelo de perfil' }),
];

const meta = {
  title: 'AnimalForm/PhotoManager',
  component: PhotoManager,
  args: {
    photos: [],
    onChange: fn(),
    max: 8,
    maxUploadMb: 5,
    upload: fn<UploadPhoto>(async () => UPLOADED),
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <LiveRegion>
        <div className="mx-auto max-w-xl">
          <Story />
        </div>
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof PhotoManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithPhotos: Story = { args: { photos: three() } };

/** AFORM-07 */
export const AtLimit: Story = {
  args: { photos: three(), max: 3 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Adicionar foto' }),
    ).toBeDisabled();
  },
};

export const Uploading: Story = {
  args: {
    photos: [
      makePhoto(1, { alt: 'Caramelo deitado' }),
      makePhoto(2, { status: 'uploading', id: undefined }),
    ],
  },
};

/** AFORM-09 */
export const UploadError: Story = {
  args: {
    photos: [
      makePhoto(1, { alt: 'Caramelo deitado' }),
      makePhoto(2, {
        status: 'error',
        id: undefined,
        file: pngFile('caramelo.png'),
        error: 'Não foi possível enviar a foto. Tente de novo.',
      }),
    ],
  },
  play: async ({ canvas, args }) => {
    const photo = canvas.getByRole('group', { name: 'Foto 2 de 2' });
    await userEvent.click(
      within(photo).getByRole('button', { name: 'Tentar de novo' }),
    );
    await waitFor(() =>
      expect(
        within(photo).queryByRole('button', { name: 'Tentar de novo' }),
      ).toBeNull(),
    );
    await expect(args.upload).toHaveBeenCalledTimes(1);
  },
};

/** AFORM-05 */
export const FieldError: Story = {
  args: { error: 'Adicione pelo menos 1 foto.' },
};

/** AFORM-09: a picked file is uploaded and shows its preview. */
export const PickAndUpload: Story = {
  play: async ({ canvasElement, canvas, args }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, pngFile('nina.png'));
    await expect(
      await canvas.findByRole('img', { name: 'Foto 1 do animal' }),
    ).toBeVisible();
    await waitFor(() => expect(canvas.queryByText('Enviando…')).toBeNull());
    await expect(args.upload).toHaveBeenCalledTimes(1);
  },
};

/** AFORM-10, AFORM-11: keyboard only. */
export const ReorderWithKeyboard: Story = {
  args: { photos: three() },
  play: async ({ canvas }) => {
    const first = canvas.getByRole('group', { name: 'Foto 1 de 3' });
    within(first).getByRole('button', { name: 'Mover para a direita' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(
      within(canvas.getByRole('group', { name: 'Foto 2 de 3' })).getByRole(
        'img',
      ),
    ).toHaveAccessibleName('Caramelo deitado');

    const last = canvas.getByRole('group', { name: 'Foto 3 de 3' });
    await userEvent.click(
      within(last).getByRole('button', { name: 'Usar como capa' }),
    );
    const cover = canvas.getByRole('group', { name: 'Foto 1 de 3' });
    await expect(within(cover).getByRole('img')).toHaveAccessibleName(
      'Caramelo de perfil',
    );
    await expect(within(cover).getByText('Capa')).toBeVisible();
  },
};
