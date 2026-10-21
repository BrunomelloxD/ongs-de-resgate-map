import { render, screen } from '@testing-library/react';
import type { AnimalGridProps } from '../components/animal-grid';
import type { NgoProfileProps } from '../components/ngo-profile';
import type { NgoMiniMapProps } from '../ngo-mini-map.client';
import { makeNgo, makeNgoAnimal } from '../test-fixtures';
import { NgoPageContainer } from './ngo-page.container';

const getNgoAnimals = vi.hoisted(() => vi.fn());
const grid = vi.hoisted(() => ({
  props: undefined as unknown as AnimalGridProps,
}));

vi.mock('../queries/get-ngo', () => ({ getNgoAnimals }));
vi.mock('../ngo-mini-map.client', () => ({
  NgoMiniMap: (props: NgoMiniMapProps) => (
    <p>
      mini-mapa {props.tileUrl} {props.lat},{props.lng}
    </p>
  ),
}));
vi.mock('../animal-filters-nav.client', () => ({
  AnimalFiltersNav: ({ value }: { value: unknown }) => (
    <p>filtros {JSON.stringify(value)}</p>
  ),
}));
vi.mock('../components/ngo-profile', () => ({
  NgoProfile: ({ ngo, miniMap }: NgoProfileProps) => (
    <div>
      perfil {ngo.name}
      {miniMap}
    </div>
  ),
}));
vi.mock('../components/animal-grid', () => ({
  AnimalGrid: (props: AnimalGridProps) => {
    grid.props = props;
    return (
      <div>
        grade {props.page.data.length}
        {props.filters}
      </div>
    );
  },
}));

const PAGE = {
  data: [makeNgoAnimal()],
  meta: { total: 1, page: 2, limit: 12, last_page: 3 },
};

describe('NgoPageContainer', () => {
  it('NGO-05/06/10: lê filtros e página da URL e pede os animais', async () => {
    getNgoAnimals.mockResolvedValue(PAGE);

    render(
      await NgoPageContainer({
        ngo: makeNgo(),
        searchParams: Promise.resolve({ species: 'CAT', page: '2' }),
      }),
    );

    expect(getNgoAnimals).toHaveBeenCalledWith(
      'patas-do-bairro',
      { species: 'CAT', sex: undefined, size: undefined, available: true },
      2,
    );
    expect(screen.getByText('perfil Patas do Bairro')).toBeInTheDocument();
    expect(
      screen.getByText(
        'mini-mapa http://tiles.test/{z}/{x}/{y}.png -23.5869,-46.6347',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('grade 1')).toBeInTheDocument();
    expect(
      screen.getByText('filtros {"species":"CAT","available":true}'),
    ).toBeInTheDocument();
  });

  it('monta os links dos animais, das páginas e de "Limpar filtros"', async () => {
    getNgoAnimals.mockResolvedValue(PAGE);

    render(
      await NgoPageContainer({
        ngo: makeNgo({ hasAnimals: false }),
        searchParams: Promise.resolve({ species: 'CAT', available: 'false' }),
      }),
    );

    expect(grid.props.hasAnimals).toBe(false);
    expect(grid.props.whatsappUrl).toBe(makeNgo().whatsappUrl);
    expect(grid.props.animalHref('abc')).toBe(
      '/ong/patas-do-bairro/animais/abc',
    );
    expect(grid.props.pageHref(3)).toBe(
      '/ong/patas-do-bairro?species=CAT&available=false&page=3',
    );
    expect(grid.props.clearHref).toBe('/ong/patas-do-bairro');
  });

  it('a ONG saiu entre as duas chamadas (404) → só o perfil', async () => {
    getNgoAnimals.mockResolvedValue(null);

    render(
      await NgoPageContainer({
        ngo: makeNgo(),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText('perfil Patas do Bairro')).toBeInTheDocument();
    expect(screen.queryByText(/grade/)).not.toBeInTheDocument();
  });
});
