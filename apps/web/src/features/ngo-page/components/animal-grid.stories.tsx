import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { LOCAL_IMAGE_URL, makeNgo, makeNgoAnimal } from '../test-fixtures';
import { AnimalGrid } from './animal-grid';

const cover = {
  ...makeNgoAnimal().cover!,
  url: LOCAL_IMAGE_URL,
  thumbUrl: LOCAL_IMAGE_URL,
};
const NAMES = ['Mel', 'Caramelo', 'Nina', 'Pipoca', 'Luna', 'Frajola'];
const animals = NAMES.map((name, i) =>
  makeNgoAnimal({
    id: `id-${i}`,
    name,
    cover: { ...cover, alt: `${name}, gato, porte pequeno` },
    available: i !== 5,
  }),
);

const meta = {
  title: 'NgoPage/AnimalGrid',
  component: AnimalGrid,
  args: {
    page: {
      data: animals,
      meta: { total: 6, page: 1, limit: 12, last_page: 1 },
    },
    hasAnimals: true,
    whatsappUrl: makeNgo().whatsappUrl,
    animalHref: (id: string) => `/ong/patas-do-bairro/animais/${id}`,
    pageHref: (page: number) => `/ong/patas-do-bairro?page=${page}`,
    clearHref: '/ong/patas-do-bairro',
  },
} satisfies Meta<typeof AnimalGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAnimals: Story = {};

export const Paginated: Story = {
  args: {
    page: {
      data: animals,
      meta: { total: 30, page: 2, limit: 12, last_page: 3 },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Página 2 de 3')).toBeInTheDocument();
  },
};

export const NgoWithoutAnimals: Story = {
  args: {
    hasAnimals: false,
    page: { data: [], meta: { total: 0, page: 1, limit: 12, last_page: 1 } },
  },
};

export const NoMatches: Story = {
  args: {
    page: { data: [], meta: { total: 0, page: 1, limit: 12, last_page: 1 } },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Limpar filtros' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
  },
};
