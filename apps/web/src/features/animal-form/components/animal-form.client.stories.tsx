import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import type {
  DeleteAnimal,
  MyAnimal,
  SaveAnimal,
  SetAvailability,
  UploadPhoto,
} from '../animal-form.types';
import { LOCAL_IMAGE_URL, makeMyAnimal } from '../test-fixtures';
import { AnimalForm } from './animal-form.client';

const withLocalPhotos = (animal: MyAnimal): MyAnimal => ({
  ...animal,
  images: animal.images.map((image) => ({
    ...image,
    url: LOCAL_IMAGE_URL,
    thumbUrl: LOCAL_IMAGE_URL,
  })),
});

const pngFile = () =>
  new File(
    [
      Uint8Array.from(atob(LOCAL_IMAGE_URL.split(',')[1]!), (c) =>
        c.charCodeAt(0),
      ),
    ],
    'mel.png',
    { type: 'image/png' },
  );

const meta = {
  title: 'AnimalForm/AnimalForm',
  component: AnimalForm,
  args: {
    animal: null,
    maxPhotos: 3,
    maxUploadMb: 5,
    uploadPhoto: fn<UploadPhoto>(async () => ({
      ok: true,
      id: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
      thumbUrl: LOCAL_IMAGE_URL,
    })),
    saveAnimal: fn<SaveAnimal>(async () => ({
      ok: false,
      error:
        'Sua ONG atingiu o limite de 10 animais da demo. Exclua um animal para cadastrar outro.',
      fieldErrors: {},
    })),
    deleteAnimal: fn<DeleteAnimal>(async () => ({
      ok: false,
      error: 'Não foi possível excluir agora. Tente de novo.',
    })),
    markUnavailable: fn<SetAvailability>(async () => ({ ok: true })),
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
} satisfies Meta<typeof AnimalForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Raça')).toHaveValue('SRD (vira-lata)');
  },
};

export const Edit: Story = {
  args: { animal: withLocalPhotos(makeMyAnimal()) },
};

/** DEMO-06: the notice comes from the app. */
export const WithExpiryNotice: Story = {
  args: {
    notice: (
      <p className="rounded-2xl bg-gem-soft px-4 py-3 text-sm font-semibold text-gem-soft-fg">
        Seus dados serão apagados em 27/10/2026 — faltam 7 dias
      </p>
    ),
  },
};

/** AFORM-05, A11Y-05 */
export const SubmitWithoutPhoto: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Nome'), 'Mel');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar animal' }),
    );
    const summary = canvas.getByRole('region', {
      name: 'Corrija para continuar',
    });
    await expect(
      within(summary).getByRole('link', {
        name: 'Adicione pelo menos 1 foto.',
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Adicionar foto' }),
      ).toHaveFocus(),
    );
  },
};

/** AFORM-09: the photo fails, the typed fields stay. */
export const PhotoFails: Story = {
  args: {
    uploadPhoto: fn<UploadPhoto>(async () => ({
      ok: false,
      error: 'Não foi possível enviar a foto. Tente de novo.',
    })),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(canvas.getByLabelText('Nome'), 'Mel');
    await userEvent.upload(
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!,
      pngFile(),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Tentar de novo' }),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Nome')).toHaveValue('Mel');
  },
};

/** DEMO-09: the api refuses the new animal. */
export const QuotaReached: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    await userEvent.upload(
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!,
      pngFile(),
    );
    await waitFor(() => expect(canvas.queryByText('Enviando…')).toBeNull());
    await userEvent.type(canvas.getByLabelText('Nome'), 'Mel');
    await userEvent.click(canvas.getByRole('radio', { name: 'Gato' }));
    await userEvent.click(canvas.getByRole('radio', { name: 'Fêmea' }));
    await userEvent.click(canvas.getByRole('radio', { name: 'Pequeno' }));
    await userEvent.type(canvas.getByLabelText('Idade estimada'), '2');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar animal' }),
    );
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Sua ONG atingiu o limite de 10 animais da demo. Exclua um animal para cadastrar outro.',
    );
    await expect(args.saveAnimal).toHaveBeenCalledTimes(1);
  },
};
