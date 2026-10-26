import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { LookupCepResult } from '../location.types';
import { makeCepAddress, makeCity } from '../test-fixtures';
import { LocationPicker } from './location-picker.client';

const NOT_FOUND =
  'CEP não encontrado. Confira os números ou busque pela cidade.';

/** A browser whose geolocation answers with the given error code (1, 2 or 3). */
const failingGeolocation = (code: number) => ({
  getCurrentPosition: fn(
    (_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
      fail?.({ code } as GeolocationPositionError),
  ),
});

const meta = {
  title: 'Location/LocationPicker',
  component: LocationPicker,
  args: {
    geolocation: {
      getCurrentPosition: fn((ok: PositionCallback) =>
        ok({
          coords: { latitude: -23.5869, longitude: -46.6347 },
        } as GeolocationPosition),
      ),
    },
    lookupCep: fn<(cep: string) => Promise<LookupCepResult>>(async () => ({
      ok: true,
      address: makeCepAddress(),
    })),
    navigate: fn(),
    searchCities: fn(async () => [makeCity()]),
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocationPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Granted: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Usar minha localização' }),
    );
    await expect(args.navigate).toHaveBeenCalledWith(
      '/mapa#c=-23.5869,-46.6347&r=5',
    );
  },
};

export const Asking: Story = {
  args: { geolocation: { getCurrentPosition: fn() } },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Usar minha localização' }),
    );
    await expect(
      canvas.getByRole('button', { name: 'Procurando sua localização…' }),
    ).toBeDisabled();
  },
};

export const Denied: Story = {
  args: { geolocation: failingGeolocation(1) },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Usar minha localização' }),
    );
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'A localização está bloqueada',
    );
  },
};

export const Unavailable: Story = {
  args: { geolocation: failingGeolocation(3) },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Usar minha localização' }),
    );
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Não encontramos sua localização',
    );
  },
};

export const Manual: Story = {
  args: { initialPhase: 'manual' },
};

export const CepFound: Story = {
  args: { initialPhase: 'manual' },
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('combobox', { name: 'Cidade ou CEP' }),
      '01310100',
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Ver ONGs nesta região' }),
    );
    await waitFor(() =>
      expect(args.navigate).toHaveBeenCalledWith(
        '/mapa#c=-23.5613,-46.6565&r=5',
      ),
    );
  },
};

export const CepNotFound: Story = {
  args: {
    initialPhase: 'manual',
    lookupCep: fn<(cep: string) => Promise<LookupCepResult>>(async () => ({
      ok: false,
      error: NOT_FOUND,
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('combobox', { name: 'Cidade ou CEP' }),
      '00000000',
    );
    await expect(await canvas.findByText(NOT_FOUND)).toBeVisible();
  },
};

export const Mobile: Story = {
  args: { initialPhase: 'denied' },
  globals: { viewport: { value: 'mobile' } },
};

/** Figcraft 02-permissao-de-localizacao-mobile: the round map above the title. */
export const IdleMobile: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvasElement }) => {
    const art = canvasElement.querySelector('img')!;
    await expect(getComputedStyle(art).display).not.toBe('none');
  },
};

/** Figcraft 02-permissao-negada: the CEP suggestion open under the field. */
export const DeniedWithCepSuggestion: Story = {
  args: { initialPhase: 'denied' },
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('combobox', { name: 'Cidade ou CEP' }),
      '04101000',
    );
    await expect(
      await canvas.findByRole('option', {
        name: '04101-000 Bela Vista, São Paulo – SP',
      }),
    ).toBeVisible();
  },
};

export const DeniedDesktop: Story = {
  args: { initialPhase: 'denied' },
  globals: { viewport: { value: 'desktop' } },
};
