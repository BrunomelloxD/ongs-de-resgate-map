import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PinPicker } from '@/components/ui/pin-picker.client';
import type { UpdateProfileResult } from '../ngo-account.types';
import { LOCAL_IMAGE_URL, makeMyNgo } from '../test-fixtures';
import { ProfileForm, type ProfileFormProps } from './profile-form.client';

// Plain tile drawn locally: stories never fetch real tiles. A picture, not a theme colour.
const STORY_TILE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="linen"/><path d="M0 128H256M128 0V256" stroke="wheat" stroke-width="10"/></svg>',
)}`;

const SAVED: UpdateProfileResult = { ok: true, message: 'Perfil atualizado.' };

const meta = {
  title: 'NgoAccount/ProfileForm',
  component: ProfileForm,
  args: {
    ngo: makeMyNgo({ imageUrl: LOCAL_IMAGE_URL }),
    updateProfile: fn<ProfileFormProps['updateProfile']>(async () => SAVED),
    uploadImage: fn<ProfileFormProps['uploadImage']>(async () => ({
      ok: true,
      imageUrl: LOCAL_IMAGE_URL,
    })),
    maxUploadMb: 5,
    lookupCep: fn(async () => ({ ok: false as const, error: 'indisponível' })),
    geocodeAddress: fn(async () => ({
      found: true,
      lat: -22.9056,
      lng: -47.0608,
    })),
    PinPicker,
    tileUrl: STORY_TILE_URL,
    attribution: '© OpenStreetMap contributors',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl px-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('CNPJ')).toHaveAttribute('readonly');
    await expect(canvas.getByLabelText('Razão social')).toHaveValue(
      'Patas do Bairro',
    );
  },
};

export const WithoutImage: Story = {
  args: { ngo: makeMyNgo({ imageUrl: null }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Enviar uma imagem')).toBeVisible();
  },
};

export const WithDemoNotice: Story = {
  args: {
    notice: (
      <p className="rounded-card bg-gem-soft p-4 text-gem-soft-fg">
        Seus dados serão apagados em 27/10/2026 — faltam 6 dias
      </p>
    ),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        'Seus dados serão apagados em 27/10/2026 — faltam 6 dias',
      ),
    ).toBeVisible();
  },
};

export const Saved: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar alterações' }),
    );
    await expect(await canvas.findByText('Perfil atualizado.')).toBeVisible();
    await expect(args.updateProfile).toHaveBeenCalledOnce();
  },
};

export const Pending: Story = {
  args: {
    updateProfile: fn<ProfileFormProps['updateProfile']>(
      () => new Promise<UpdateProfileResult>(() => {}),
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar alterações' }),
    );
    await expect(
      canvas.getByRole('button', { name: 'Salvando…' }),
    ).toBeDisabled();
  },
};

export const ValidationError: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.clear(canvas.getByLabelText('E-mail'));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar alterações' }),
    );
    await expect(
      canvas.getByRole('link', {
        name: 'Informe um e-mail válido, como nome@ong.org.',
      }),
    ).toBeVisible();
    await waitFor(() => expect(canvas.getByLabelText('E-mail')).toHaveFocus());
    await expect(args.updateProfile).not.toHaveBeenCalled();
  },
};

export const AddressChanged: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.clear(canvas.getByLabelText('Cidade'));
    await userEvent.type(canvas.getByLabelText('Cidade'), 'Campinas');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar alterações' }),
    );
    await expect(
      canvas.getByRole('link', {
        name: 'Confirme a localização no mapa antes de salvar.',
      }),
    ).toBeVisible();
    await expect(args.updateProfile).not.toHaveBeenCalled();
  },
};

export const SaveFailed: Story = {
  args: {
    updateProfile: fn<ProfileFormProps['updateProfile']>(async () => ({
      ok: false,
      errors: { fields: {}, hours: {} },
      error: 'Não foi possível salvar o perfil agora. Tente de novo.',
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar alterações' }),
    );
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar o perfil agora. Tente de novo.',
    );
  },
};

export const ImageUploaded: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.upload(
      canvas.getByLabelText('Trocar imagem'),
      new File(['png'], 'logo.png', { type: 'image/png' }),
    );
    await expect(await canvas.findByText('Imagem atualizada.')).toBeVisible();
    await expect(args.uploadImage).toHaveBeenCalledOnce();
  },
};

export const ImageRejected: Story = {
  args: {
    uploadImage: fn<ProfileFormProps['uploadImage']>(async () => ({
      ok: false,
      error:
        'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.upload(
      canvas.getByLabelText('Trocar imagem'),
      new File(['png'], 'logo.png', { type: 'image/png' }),
    );
    await expect(
      await canvas.findByText(
        'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
      ),
    ).toBeVisible();
  },
};
