import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { NgoSearchResponse } from '../map.types';
import { LOCAL_TILE_URL, makeNgoPin } from '../test-fixtures';
import { FakePlaceSearch } from '../test-place-search';
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
    PlaceSearch: FakePlaceSearch,
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
  play: async ({ canvas, canvasElement }) => {
    // T187: the action submits the "Cidade ou CEP" field; the map stays behind.
    await expect(
      canvas.getByRole('button', { name: 'Buscar pela cidade ou CEP' }),
    ).toBeVisible();
    await expect(
      canvasElement.querySelector('[inert] .leaflet-container'),
    ).not.toBeNull();
  },
};

/** Figcraft 03-mapa-erro-de-localizacao-mobile: the error in a panel over the faded map. */
export const LocationErrorMobile: Story = {
  args: { hash: '' },
  globals: { viewport: { value: 'mobile' } },
  decorators: [
    (Story) => (
      <div className="flex h-[800px] w-full">
        <Story />
      </div>
    ),
  ],
};

/** Figcraft 03-mapa-de-ongs-mobile: the search bar, "Centralizar em mim" and the collapsed sheet. */
export const MobileCollapsed: Story = {
  globals: { viewport: { value: 'mobile' } },
  decorators: [
    (Story) => (
      <div className="flex h-[800px] w-full">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: '2 ONGs perto de você' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Lista de ONGs' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Figcraft 03-mapa-lista-aberta-mobile: "Filtros" opens the sheet with the chips under the title. */
export const MobileOpen: Story = {
  ...MobileCollapsed,
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { name: '2 ONGs perto de você' });
    await userEvent.click(canvas.getByRole('button', { name: 'Filtros' }));
    await expect(canvas.getByRole('region', { name: 'Filtros' })).toBeVisible();
  },
};

/** Figcraft 03-mapa-de-ongs-desktop: the column with the logo, the search and the list. */
export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('complementary', { name: 'Lista de ONGs' }),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('Buscar outra região'),
    ).toBeInTheDocument();
  },
};

/** Figcraft 03-mapa-carregando: the pill in the middle of the map. */
export const Loading: Story = {
  args: { search: fn(() => new Promise<NgoSearchResponse>(() => {})) },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Isso leva poucos segundos'),
    ).toBeVisible();
  },
};

/** Figcraft 03-mapa-nenhuma-ong: the dashed radius around the center. */
export const EmptyDesktop: Story = {
  args: { search: fn(async () => ({ items: [], truncated: false })) },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        canvasElement.querySelector('path.stroke-brand-deep'),
      ).not.toBeNull(),
    );
  },
};

/** M-06: the preview tied to the selected pin. */
export const PreviewAnchored: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: /^Patas do Bairro, / }),
    );
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="map-anchored"]'),
      ).not.toBeNull(),
    );
  },
};
