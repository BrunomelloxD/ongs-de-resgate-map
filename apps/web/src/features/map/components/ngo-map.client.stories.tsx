import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { NgoSearchResponse } from '../map.types';
import { LOCAL_TILE_URL, makeNgoPin } from '../test-fixtures';
import { NgoMap } from './ngo-map.client';

// Vila Mariana, São Paulo.
const HASH = '#c=-23.5869,-46.6347&r=5';

const FOUND: NgoSearchResponse = {
  items: [
    makeNgoPin({
      id: 'patas',
      lat: -23.5789,
      lng: -46.6347,
      thumbUrl: null,
    }),
    makeNgoPin({
      id: 'gatil',
      slug: 'gatil-sete-vidas',
      name: 'Gatil Sete Vidas',
      openNow: false,
      lat: -23.6,
      lng: -46.62,
      thumbUrl: null,
    }),
  ],
  truncated: false,
};

const meta = {
  title: 'Map/NgoMap',
  component: NgoMap,
  args: {
    tileUrl: LOCAL_TILE_URL,
    attribution: '© OpenStreetMap contributors',
    hash: HASH,
    onHashChange: fn(),
    search: fn(async () => FOUND),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[640px] w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NgoMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Below 1024 px the list is in a collapsed bottom sheet: open it first. */
async function openList(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
) {
  const handle = canvas.queryByRole('button', { name: 'Lista de ONGs' });
  if (handle?.getAttribute('aria-expanded') === 'false') {
    await userEvent.click(handle);
  }
}

export const Ready: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('© OpenStreetMap contributors'),
    ).toBeVisible();
    await openList(canvas);
    await userEvent.click(
      await canvas.findByRole('button', { name: /Patas do Bairro/ }),
    );
    await expect(
      await canvas.findByRole('link', { name: 'Ver ONG e animais' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
  },
};

export const Empty: Story = {
  args: { search: fn(async () => ({ items: [], truncated: false })) },
  play: async ({ args, canvas }) => {
    await openList(canvas);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Ampliar raio' }),
    );
    await waitFor(() =>
      expect(args.onHashChange).toHaveBeenCalledWith(
        '#c=-23.5869,-46.6347&r=10',
      ),
    );
  },
};

export const SearchFailed: Story = {
  args: {
    search: fn(async () => {
      throw new Error('GET /map/ngos: 503');
    }),
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Não conseguimos carregar as ONGs.'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('region', { name: 'Mapa de ONGs' }),
    ).toBeVisible();
  },
};

export const LocationError: Story = {
  args: { hash: '' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Buscar pela cidade ou CEP' }),
    ).toHaveAttribute('href', '/localizacao');
  },
};
