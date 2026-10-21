import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { LOCAL_THUMB_URL, makeRankedNgo } from '../test-fixtures';
import { NgoList } from './ngo-list';

const ITEMS = [
  makeRankedNgo({ id: 'patas', thumbUrl: LOCAL_THUMB_URL, distanceKm: 1.2 }),
  makeRankedNgo({
    id: 'gatil',
    slug: 'gatil-sete-vidas',
    name: 'Gatil Sete Vidas',
    thumbUrl: LOCAL_THUMB_URL,
    distanceKm: 1.8,
  }),
  makeRankedNgo({
    id: 'caramelo',
    slug: 'abrigo-caramelo',
    name: 'Abrigo Caramelo',
    openNow: false,
    todayHours: { closed: true, opensAt: null, closesAt: null },
    thumbUrl: null,
    distanceKm: 2.4,
  }),
];

const meta = {
  title: 'Map/NgoList',
  component: NgoList,
  args: {
    status: 'ready',
    items: ITEMS,
    radiusKm: 5,
    filtered: false,
    truncated: false,
    selectedId: 'patas',
    otherCityHref: '/localizacao',
    onSelect: fn(),
    onRetry: fn(),
    onWiden: fn(),
    onClearFilters: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NgoList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByRole('button', { name: /Patas do Bairro/ }),
    ).toHaveAttribute('aria-current', 'true');
    await userEvent.click(
      canvas.getByRole('button', { name: /Gatil Sete Vidas/ }),
    );
    await expect(args.onSelect).toHaveBeenCalledWith('gatil');
  },
};

export const Truncated: Story = {
  args: { truncated: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('Aproxime o mapa para ver todas as ONGs.'),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  args: { status: 'loading', items: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Buscando ONGs perto de você…',
    );
  },
};

export const Empty: Story = {
  args: { status: 'empty', items: [] },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Ampliar raio' }));
    await expect(args.onWiden).toHaveBeenCalled();
    await expect(
      canvas.getByRole('link', { name: 'Buscar outra cidade' }),
    ).toBeVisible();
  },
};

export const EmptyAtWidestRadius: Story = {
  args: { status: 'empty', items: [], radiusKm: 25, onWiden: undefined },
};

export const EmptyByFilters: Story = {
  args: { status: 'ready', items: [], filtered: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Limpar filtros' }),
    );
    await expect(args.onClearFilters).toHaveBeenCalled();
  },
};

export const SearchFailed: Story = {
  args: { status: 'error', items: [] },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Não conseguimos carregar as ONGs.',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Tentar de novo' }),
    );
    await expect(args.onRetry).toHaveBeenCalled();
  },
};
