import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { MapViewProps } from '@/components/ui/map-view.client';
import type { SearchNgos } from '../lib/fetch-ngos';
import { mapDictionary as t } from '../map.dictionary';
import type { NgoSearchResponse } from '../map.types';
import { makeNgoPin } from '../test-fixtures';
import { FAKE_PLACE, FakePlaceSearch } from '../test-place-search';
import { BRAZIL_BOUNDS, NgoMap, type NgoMapProps } from './ngo-map.client';

const recorded = vi.hoisted(() => ({
  map: undefined as unknown as MapViewProps,
}));

// Leaflet needs a real layout; the generic MapView has its own tests.
vi.mock('@/components/ui/map-view.client', () => ({
  MapView: (props: MapViewProps) => {
    recorded.map = props;
    return (
      <div data-testid="map-view">
        {props.markers?.map((marker) => (
          <button
            key={marker.id}
            type="button"
            data-variant={marker.variant}
            onClick={() => props.onSelect?.(marker.id)}
          >
            {marker.label}
          </button>
        ))}
        {/* T188: the preview now rides on the map, tied to its pin. */}
        {props.anchored?.content}
      </div>
    );
  },
}));

const CENTER = { lat: -23.5869, lng: -46.6347 };
const HASH = `#c=${CENTER.lat},${CENTER.lng}&r=5`;
const KM_PER_DEG_LAT = (6371 * Math.PI) / 180;
const north = (km: number) => CENTER.lat + km / KM_PER_DEG_LAT;

const PATAS = makeNgoPin({
  id: 'patas',
  name: 'Patas do Bairro',
  lat: north(1),
  lng: CENTER.lng,
});
const GATIL = makeNgoPin({
  id: 'gatil',
  slug: 'gatil-sete-vidas',
  name: 'Gatil Sete Vidas',
  openNow: false,
  lat: north(2),
  lng: CENTER.lng,
});
const FOUND: NgoSearchResponse = { items: [GATIL, PATAS], truncated: false };

function mockWidth(width: number) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === '(min-width: 1024px)' && width >= 1024,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

function setup(props: Partial<NgoMapProps> = {}) {
  const search = vi.fn<SearchNgos>(async () => FOUND);
  const onHashChange = vi.fn();
  const view = render(
    <NgoMap
      tileUrl="http://tiles.test/{z}/{x}/{y}.png"
      attribution="© OpenStreetMap contributors"
      hash={HASH}
      onHashChange={onHashChange}
      search={search}
      PlaceSearch={FakePlaceSearch}
      {...props}
    />,
  );
  const rerenderHash = (hash: string) =>
    view.rerender(
      <NgoMap
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        hash={hash}
        onHashChange={onHashChange}
        search={props.search ?? search}
        PlaceSearch={FakePlaceSearch}
        {...props}
      />,
    );
  return {
    ...view,
    search: vi.mocked(props.search ?? search),
    onHashChange,
    rerenderHash,
  };
}

const marker = (id: string) =>
  recorded.map.markers!.find((item) => item.id === id)!;
// T187: on the phone the filters sit in the open sheet, behind the bar's "Filtros".
const openFilters = () =>
  fireEvent.click(screen.getByRole('button', { name: t.search.filters }));
const listItem = (name: RegExp) =>
  within(screen.getByRole('list')).getByRole('button', { name });

beforeEach(() => {
  vi.useFakeTimers();
  mockWidth(390);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NgoMap', () => {
  it('MAP-01: enquadra 5 km em volta do centro, com tiles, atribuição e o visitante', async () => {
    const { search } = setup();
    await advance(400);

    const [[south, west], [north5, east]] = recorded.map.bounds;
    expect(north5 - CENTER.lat).toBeCloseTo(5 / KM_PER_DEG_LAT, 6);
    expect(CENTER.lat - south).toBeCloseTo(5 / KM_PER_DEG_LAT, 6);
    expect(east).toBeGreaterThan(CENTER.lng);
    expect(west).toBeLessThan(CENTER.lng);
    expect(recorded.map.tileUrl).toBe('http://tiles.test/{z}/{x}/{y}.png');
    expect(recorded.map.attribution).toBe('© OpenStreetMap contributors');
    expect(recorded.map.visitor).toEqual([CENTER.lat, CENTER.lng]);
    expect(recorded.map.clusterLabel(3)).toBe('3 ONGs nesta área');
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('MAP-03/MAP-07: pinos aberta e fechada, e a lista por distância', async () => {
    setup();
    await advance(400);

    expect(marker('patas')).toMatchObject({
      variant: 'open',
      label: 'Patas do Bairro, aberta agora',
      position: [PATAS.lat, PATAS.lng],
    });
    expect(marker('gatil')).toMatchObject({
      variant: 'closed',
      label: 'Gatil Sete Vidas, fechada agora',
    });
    const names = within(screen.getByRole('list'))
      .getAllByRole('button')
      .map((item) => item.textContent);
    expect(names[0]).toContain('Patas do Bairro');
    expect(names[1]).toContain('Gatil Sete Vidas');
  });

  it('MAP-10: selecionar na lista destaca o pino e centraliza nele', async () => {
    setup();
    await advance(400);

    fireEvent.click(listItem(/Gatil Sete Vidas/));

    expect(marker('gatil').variant).toBe('selected');
    expect(marker('patas').variant).toBe('open');
    expect(recorded.map.focus).toEqual({ position: [GATIL.lat, GATIL.lng] });
  });

  it('MAP-11/MAP-05: selecionar o pino destaca o item e abre a prévia', async () => {
    setup();
    await advance(400);

    fireEvent.click(
      within(screen.getByTestId('map-view')).getByRole('button', {
        name: 'Patas do Bairro, aberta agora',
      }),
    );

    expect(listItem(/Patas do Bairro/)).toHaveAttribute('aria-current', 'true');
    expect(listItem(/Gatil Sete Vidas/)).not.toHaveAttribute('aria-current');
    expect(recorded.map.focus).toBeUndefined();
    expect(
      screen.getByRole('link', { name: 'Ver ONG e animais' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
  });

  it('"Fechar prévia" tira a seleção', async () => {
    setup();
    await advance(400);
    fireEvent.click(listItem(/Patas do Bairro/));

    fireEvent.click(screen.getByRole('button', { name: t.preview.close }));

    expect(
      screen.queryByRole('link', { name: 'Ver ONG e animais' }),
    ).not.toBeInTheDocument();
    expect(marker('patas').variant).toBe('open');
  });

  it('MAP-14: "Ampliar raio" passa de 5 para 10 e de 10 para 25 km e busca de novo', async () => {
    const empty = vi.fn<SearchNgos>(async () => ({
      items: [],
      truncated: false,
    }));
    const { onHashChange, rerenderHash } = setup({ search: empty });
    await advance(400);

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar raio' }));
    expect(onHashChange).toHaveBeenLastCalledWith(
      `#c=${CENTER.lat},${CENTER.lng}&r=10`,
    );

    rerenderHash(`#c=${CENTER.lat},${CENTER.lng}&r=10`);
    await advance(400);
    expect(empty).toHaveBeenCalledTimes(2);
    expect(recorded.map.bounds[1][0] - CENTER.lat).toBeCloseTo(
      10 / KM_PER_DEG_LAT,
      6,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar raio' }));
    expect(onHashChange).toHaveBeenLastCalledWith(
      `#c=${CENTER.lat},${CENTER.lng}&r=25`,
    );

    rerenderHash(`#c=${CENTER.lat},${CENTER.lng}&r=25`);
    await advance(400);
    expect(empty).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByRole('button', { name: 'Ampliar raio' }),
    ).not.toBeInTheDocument();
  });

  it('MAPF-02: escolher 25 km nos filtros grava o raio no fragmento', async () => {
    const { onHashChange } = setup();
    await advance(400);

    openFilters();

    // T188 (M-04): the radius is a dropdown chip.
    fireEvent.change(screen.getByRole('combobox', { name: 'Distância' }), {
      target: { value: '25' },
    });

    expect(onHashChange).toHaveBeenCalledExactlyOnceWith(
      `#c=${CENTER.lat},${CENTER.lng}&r=25`,
    );
  });

  it('MAPF-01: "Aberta agora" tira a ONG fechada da lista e do mapa', async () => {
    setup();
    await advance(400);

    openFilters();

    fireEvent.click(screen.getByRole('button', { name: 'Aberta agora' }));

    expect(recorded.map.markers!.map((item) => item.id)).toEqual(['patas']);
    expect(screen.queryByText('Gatil Sete Vidas')).not.toBeInTheDocument();
  });

  it('MAPF-03/MAPF-04: espécie vai para a busca; sem resultado, "Limpar filtros" volta ao padrão', async () => {
    const search = vi
      .fn<SearchNgos>()
      .mockResolvedValueOnce(FOUND)
      .mockResolvedValueOnce({ items: [], truncated: false })
      .mockResolvedValue(FOUND);
    const { onHashChange } = setup({ search });
    await advance(400);

    openFilters();

    fireEvent.click(screen.getByRole('button', { name: 'Com gatos' }));
    await advance(400);
    expect(search.mock.calls[1]![0].species).toEqual(['CAT']);

    const empty = screen
      .getByText(t.list.emptyFiltered.title)
      .closest<HTMLElement>('[data-slot="empty-state"]')!;
    fireEvent.click(
      within(empty).getByRole('button', { name: 'Limpar filtros' }),
    );
    await advance(400);

    expect(search.mock.calls[2]![0].species).toEqual([]);
    expect(onHashChange).not.toHaveBeenCalled();
    expect(listItem(/Patas do Bairro/)).toBeInTheDocument();
  });

  it('MAP-16: busca falhando mantém o mapa e mostra o erro com "Tentar de novo"', async () => {
    const search = vi
      .fn<SearchNgos>()
      .mockRejectedValueOnce(new Error('GET /map/ngos: 503'))
      .mockResolvedValue(FOUND);
    setup({ search });
    await advance(400);

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não conseguimos carregar as ONGs.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await advance(400);

    expect(search).toHaveBeenCalledTimes(2);
    expect(listItem(/Patas do Bairro/)).toBeInTheDocument();
  });

  it('MAP-17: mover o mapa busca a área visível', async () => {
    const { search } = setup();
    await advance(400);

    act(() =>
      recorded.map.onMoveEnd!([
        [-23.71, -46.81],
        [-23.6, -46.7],
      ]),
    );
    await advance(400);

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1]![0].bbox).toEqual([
      -46.81, -23.71, -46.7, -23.6,
    ]);
  });

  it('a área visível de um enquadramento antigo não vale para o novo raio', async () => {
    const { search, rerenderHash } = setup();
    await advance(400);
    act(() =>
      recorded.map.onMoveEnd!([
        [-23.71, -46.81],
        [-23.6, -46.7],
      ]),
    );

    rerenderHash(`#c=${CENTER.lat},${CENTER.lng}&r=10`);
    await advance(400);

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1]![0].bbox).not.toEqual([
      -46.81, -23.71, -46.7, -23.6,
    ]);
  });

  describe('MAP-17: o centro da busca passa a ser o centro da área visível', () => {
    // About 11 km south of CENTER; its center is NEW.
    const MOVED: [[number, number], [number, number]] = [
      [-23.7369, -46.6847],
      [-23.6369, -46.5847],
    ];
    const NEW = { lat: -23.6869, lng: -46.6347 };
    const NEW_HASH = `#c=${NEW.lat},${NEW.lng}&r=5`;
    const LAR = makeNgoPin({
      id: 'lar',
      slug: 'lar-do-sul',
      name: 'Lar do Sul',
      lat: NEW.lat + 1.5 / KM_PER_DEG_LAT,
      lng: NEW.lng,
    });
    const SOUTH: NgoSearchResponse = {
      items: [PATAS, LAR],
      truncated: false,
    };

    function setupMoved() {
      const search = vi
        .fn<SearchNgos>()
        .mockResolvedValueOnce(FOUND)
        .mockResolvedValue(SOUTH);
      return setup({ search });
    }

    it('depois de 400 ms busca a nova bbox, e a lista mostra só as ONGs no raio do novo centro, com a distância recalculada', async () => {
      const { search } = setupMoved();
      await advance(400);

      act(() => recorded.map.onMoveEnd!(MOVED));
      await advance(399);
      expect(search).toHaveBeenCalledTimes(1);
      await advance(1);

      expect(search).toHaveBeenCalledTimes(2);
      expect(search.mock.calls[1]![0].bbox).toEqual([
        -46.69, -23.74, -46.58, -23.63,
      ]);
      const items = within(screen.getByRole('list')).getAllByRole('button');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Lar do Sul');
      expect(items[0]).toHaveTextContent('1,5 km');
      expect(recorded.map.markers!.map((item) => item.id)).toEqual(['lar']);
    });

    it('o fragmento passa a ter o novo centro e o mesmo raio, sem enquadrar de novo', async () => {
      const { search, onHashChange, rerenderHash } = setupMoved();
      await advance(400);
      const framed = recorded.map.bounds;

      act(() => recorded.map.onMoveEnd!(MOVED));
      expect(onHashChange).toHaveBeenCalledExactlyOnceWith(NEW_HASH);
      rerenderHash(NEW_HASH);
      await advance(400);

      expect(recorded.map.bounds).toEqual(framed);
      expect(search).toHaveBeenCalledTimes(2);
      expect(listItem(/Lar do Sul/)).toHaveTextContent('1,5 km');
    });

    it('MAPF-02/MAP-03: depois de mover, um raio novo enquadra em volta do novo centro; o pino do visitante fica onde estava', async () => {
      const { onHashChange, rerenderHash } = setupMoved();
      await advance(400);
      act(() => recorded.map.onMoveEnd!(MOVED));
      rerenderHash(NEW_HASH);
      await advance(400);

      openFilters();

      // T188 (M-04): the radius is a dropdown chip.
      fireEvent.change(screen.getByRole('combobox', { name: 'Distância' }), {
        target: { value: '25' },
      });
      expect(onHashChange).toHaveBeenLastCalledWith(
        `#c=${NEW.lat},${NEW.lng}&r=25`,
      );
      rerenderHash(`#c=${NEW.lat},${NEW.lng}&r=25`);

      const [[south], [north25]] = recorded.map.bounds;
      expect(north25 - NEW.lat).toBeCloseTo(25 / KM_PER_DEG_LAT, 6);
      expect(NEW.lat - south).toBeCloseTo(25 / KM_PER_DEG_LAT, 6);
      expect(recorded.map.visitor).toEqual([CENTER.lat, CENTER.lng]);
    });

    it('MAP-01: um centro novo vindo de fora enquadra 5 km em volta dele', async () => {
      const { rerenderHash } = setup();
      await advance(400);

      rerenderHash('#c=-22.9,-43.2&r=5');

      const [[south], [north5]] = recorded.map.bounds;
      expect(north5 - -22.9).toBeCloseTo(5 / KM_PER_DEG_LAT, 6);
      expect(-22.9 - south).toBeCloseTo(5 / KM_PER_DEG_LAT, 6);
      expect(recorded.map.visitor).toEqual([-22.9, -43.2]);
    });

    it('o enquadramento do próprio mapa (menos de 1% de deslocamento) mantém o centro e busca a área visível', async () => {
      const { search, onHashChange } = setup();
      await advance(400);

      // The fit shows a bit more than the 5 km box, off by a rounding pixel.
      act(() =>
        recorded.map.onMoveEnd!([
          [CENTER.lat - 0.06 + 0.0001, CENTER.lng - 0.08],
          [CENTER.lat + 0.06 + 0.0001, CENTER.lng + 0.08],
        ]),
      );
      await advance(400);

      expect(onHashChange).not.toHaveBeenCalled();
      expect(search).toHaveBeenCalledTimes(2);
      expect(listItem(/Patas do Bairro/)).toHaveTextContent('1 km');
    });

    it('MAP-10: centralizar num item da lista não dispara busca nem muda o fragmento', async () => {
      const { search, onHashChange } = setup();
      await advance(400);

      fireEvent.click(listItem(/Gatil Sete Vidas/));
      await advance(400);

      expect(search).toHaveBeenCalledTimes(1);
      expect(onHashChange).not.toHaveBeenCalled();
    });
  });

  it('MAP-08: em 390 px a lista fica num bottom sheet', async () => {
    mockWidth(390);
    const { container } = setup();
    await advance(400);

    const sheet = container.querySelector('[data-slot="bottom-sheet"]');
    expect(sheet).toContainElement(screen.getByRole('list'));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('MAP-08: selecionar na lista recolhe o bottom sheet para mostrar o pino', async () => {
    mockWidth(390);
    setup();
    await advance(400);
    const handle = screen.getByRole('button', { name: t.list.label });
    fireEvent.click(handle);
    expect(handle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(listItem(/Patas do Bairro/));

    expect(handle).toHaveAttribute('aria-expanded', 'false');
  });

  it('MAP-09: em 1440 px a lista fica na coluna lateral', async () => {
    mockWidth(1440);
    const { container } = setup();
    await advance(400);

    expect(
      screen.getByRole('complementary', { name: t.list.label }),
    ).toContainElement(screen.getByRole('list'));
    expect(container.querySelector('[data-slot="bottom-sheet"]')).toBeNull();
  });

  describe('T187: estrutura do figcraft (03-mapa-*)', () => {
    it('M-02: em 1440 px a coluna começa com o logo, "Sou uma ONG" e "Buscar outra região"', async () => {
      mockWidth(1440);
      const { onHashChange } = setup();
      await advance(400);
      const column = screen.getByRole('complementary', { name: t.list.label });
      const header = column.querySelector('[data-slot="map-column-header"]')!;
      const field = within(column).getByLabelText('Buscar outra região');

      expect(column.firstElementChild).toBe(header);
      expect(
        field.compareDocumentPosition(within(column).getByRole('list')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      fireEvent.submit(field.closest('form')!);
      // SEC-01: the place only goes to the fragment, with the same radius.
      expect(onHashChange).toHaveBeenCalledExactlyOnceWith(
        `#c=${FAKE_PLACE.lat},${FAKE_PLACE.lng}&r=5`,
      );
    });

    it('M-01: em 390 px a barra de busca flutua sobre o mapa, com o botão de filtros', async () => {
      const { container, onHashChange } = setup();
      await advance(400);
      const bar = container.querySelector('[data-slot="map-search-bar"]')!;

      expect(bar.querySelector('form')).toHaveAttribute('data-variant', 'bar');
      expect(
        within(bar as HTMLElement).getByLabelText('Buscar outra região'),
      ).toBeInTheDocument();
      fireEvent.submit(bar.querySelector('form')!);
      expect(onHashChange).toHaveBeenCalledWith(
        `#c=${FAKE_PLACE.lat},${FAKE_PLACE.lng}&r=5`,
      );
    });

    it('M-05/M-10: recolhido, o sheet mostra o título e as ONGs sem os filtros; "Filtros" o abre com os chips entre o título e a lista', async () => {
      setup();
      await advance(400);
      const handle = screen.getByRole('button', { name: t.list.label });
      const filters = screen.getByRole('button', { name: t.search.filters });

      expect(handle).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.getByRole('heading', { name: '2 ONGs perto de você' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: t.filters.label }),
      ).not.toBeInTheDocument();

      fireEvent.click(filters);

      expect(handle).toHaveAttribute('aria-expanded', 'true');
      expect(filters).toHaveAttribute('aria-expanded', 'true');
      const chips = screen.getByRole('region', { name: t.filters.label });
      expect(
        screen
          .getByRole('heading', { name: '2 ONGs perto de você' })
          .compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('M-05/M-10: o sheet recolhido mostra a altura de cada estado e, aberto, para a 150 px do topo', async () => {
      let finish: (value: NgoSearchResponse) => void = () => {};
      const search = vi
        .fn<SearchNgos>()
        .mockImplementationOnce(
          () => new Promise((resolve) => (finish = resolve)),
        )
        .mockResolvedValue({ items: [], truncated: false });
      const { container, rerenderHash } = setup({ search });
      const sheet = () =>
        container.querySelector<HTMLElement>('[data-slot="bottom-sheet"]')!;
      const peek = () => sheet().style.getPropertyValue('--sheet-peek');
      await advance(400);

      expect(peek()).toBe('18rem');
      expect(sheet()).toHaveStyle({ top: '150px' });
      await act(async () => finish(FOUND));
      expect(peek()).toBe('14rem');

      rerenderHash(`#c=${CENTER.lat},${CENTER.lng}&r=10`);
      await advance(400);
      expect(peek()).toBe('26rem');
    });

    it('MAP-16: com a busca falhando, o sheet recolhido mostra o erro', async () => {
      const { container } = setup({
        search: vi.fn<SearchNgos>().mockRejectedValue(new Error('503')),
      });
      await advance(400);

      expect(
        container
          .querySelector<HTMLElement>('[data-slot="bottom-sheet"]')!
          .style.getPropertyValue('--sheet-peek'),
      ).toBe('12rem');
    });

    it.each([
      ['390 px', 390],
      ['1440 px', 1440],
    ])(
      'M-03 (%s): "Centralizar em mim" pede a posição só no toque e a grava no fragmento, com o mesmo raio',
      async (_name, width) => {
        mockWidth(width);
        const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
          (ok) =>
            ok({
              coords: { latitude: -23.55, longitude: -46.63 },
            } as GeolocationPosition),
        );
        const { onHashChange } = setup({
          hash: `#c=${CENTER.lat},${CENTER.lng}&r=10`,
          geolocation: { getCurrentPosition },
        });
        await advance(400);
        expect(getCurrentPosition).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: t.locate }));

        expect(getCurrentPosition).toHaveBeenCalledExactlyOnceWith(
          expect.any(Function),
          expect.any(Function),
          { timeout: 10000 },
        );
        expect(onHashChange).toHaveBeenCalledExactlyOnceWith(
          '#c=-23.55,-46.63&r=10',
        );
      },
    );

    it('C-22: no celular, o mapa fica sem os botões de zoom', async () => {
      setup();
      await advance(400);

      expect(recorded.map.className).toBe(
        'max-lg:[&_.leaflet-control-zoom]:hidden!',
      );
    });

    it('M-03: sem posição, "Centralizar em mim" não muda o mapa', async () => {
      const { onHashChange } = setup({
        geolocation: {
          getCurrentPosition: (_, fail) =>
            fail?.({ code: 1 } as GeolocationPositionError),
        },
      });
      await advance(400);

      fireEvent.click(screen.getByRole('button', { name: t.locate }));

      expect(onHashChange).not.toHaveBeenCalled();
    });
  });

  describe('T188: prévia, carregando e vazio (figcraft 03-mapa-*)', () => {
    it('M-06: a prévia fica presa ao pino selecionado', async () => {
      setup();
      await advance(400);

      fireEvent.click(
        screen.getByRole('button', { name: /^Patas do Bairro, / }),
      );

      expect(recorded.map.anchored!.position).toEqual([PATAS.lat, PATAS.lng]);
      // 390 px: below the floating search bar and "Centralizar em mim".
      expect(recorded.map.anchored!.topClearance).toBe(140);
      expect(screen.getByRole('link', { name: t.preview.cta })).toHaveAttribute(
        'href',
        '/ong/patas-do-bairro',
      );
    });

    it('M-06: no desktop, a prévia fica acima do pino, sem folga extra', async () => {
      mockWidth(1440);
      setup();
      await advance(400);

      fireEvent.click(
        screen.getByRole('button', { name: /^Patas do Bairro, / }),
      );

      expect(recorded.map.anchored!.topClearance).toBeUndefined();
    });

    it('M-08: carregando, a pílula "Procurando ONGs perto de você…" fica no meio do mapa e a lista diz "Isso leva poucos segundos"', async () => {
      const { container } = setup({
        search: vi.fn<SearchNgos>(() => new Promise(() => {})),
      });
      await advance(400);
      const pill = container.querySelector('[data-slot="map-searching"]')!;

      expect(pill).toHaveTextContent(t.mapLoading);
      expect(pill).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText('Isso leva poucos segundos')).toBeInTheDocument();
    });

    it('M-11: sem ONGs, o raio aparece tracejado em volta do centro; com ONGs, não', async () => {
      const search = vi
        .fn<SearchNgos>()
        .mockResolvedValueOnce(FOUND)
        .mockResolvedValue({ items: [], truncated: false });
      const { container, rerenderHash } = setup({ search });
      await advance(400);
      expect(recorded.map.circle).toBeUndefined();
      expect(container.querySelector('[data-slot="map-searching"]')).toBeNull();

      rerenderHash(`#c=${CENTER.lat},${CENTER.lng}&r=10`);
      await advance(400);
      await advance(400);

      expect(screen.getByText(t.list.empty.title)).toBeInTheDocument();
      expect(recorded.map.circle).toEqual({
        center: [CENTER.lat, CENTER.lng],
        radiusM: 10000,
      });
    });
  });

  describe('MAP-15: hash inválido', () => {
    it('mostra o erro de localização com "Tentar de novo" e "Buscar pela cidade ou CEP"', () => {
      const { search } = setup({ hash: '#c=abc' });

      expect(
        screen.getByRole('heading', { name: t.locationError.title }),
      ).toBeInTheDocument();
      // T187 (M-14/M-15): the action submits the "Cidade ou CEP" field, and
      // the map stays visible behind, with no NGOs and no search.
      expect(
        screen.getByRole('button', { name: 'Buscar pela cidade ou CEP' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Cidade ou CEP')).toBeInTheDocument();
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
      expect(recorded.map.markers).toBeUndefined();
      expect(recorded.map.bounds).toEqual(BRAZIL_BOUNDS);
      expect(search).not.toHaveBeenCalled();
    });

    it('MAP-15/M-15: buscar pela cidade ou CEP abre o mapa no lugar escolhido, com 5 km', () => {
      const { onHashChange } = setup({ hash: '' });

      fireEvent.click(
        screen.getByRole('button', { name: 'Buscar pela cidade ou CEP' }),
      );

      expect(onHashChange).toHaveBeenCalledExactlyOnceWith(
        `#c=${FAKE_PLACE.lat},${FAKE_PLACE.lng}&r=5`,
      );
    });

    it('M-14: no celular, o erro fica num painel sobre o mapa esmaecido', () => {
      const { container } = setup({ hash: '' });
      const panel = screen.getByRole('region', {
        name: t.locationError.title,
      });

      expect(panel).toContainElement(
        screen.getByRole('button', { name: 'Tentar de novo' }),
      );
      expect(screen.getByTestId('map-view').parentElement).toHaveClass(
        'opacity-60',
      );
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-slot="map-search-bar"]'),
      ).toBeNull();
    });

    it('M-14: no desktop, o erro fica na coluna, abaixo do logo e de "Sou uma ONG"', () => {
      mockWidth(1440);
      setup({ hash: '' });
      const column = screen.getByRole('complementary', { name: t.list.label });

      expect(
        within(column).getByRole('link', { name: 'Sou uma ONG' }),
      ).toBeInTheDocument();
      expect(
        within(column).getByRole('heading', { name: t.locationError.title }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: t.locationError.title }),
      ).not.toBeInTheDocument();
    });

    it('LOC-03: "Tentar de novo" pede a posição uma vez e grava o centro com 5 km', () => {
      const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
        (ok) =>
          ok({
            coords: { latitude: -23.55, longitude: -46.63 },
          } as GeolocationPosition),
      );
      const { onHashChange } = setup({
        hash: '',
        geolocation: { getCurrentPosition },
      });
      expect(getCurrentPosition).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(getCurrentPosition).toHaveBeenCalledExactlyOnceWith(
        expect.any(Function),
        expect.any(Function),
        { timeout: 10000 },
      );
      expect(onHashChange).toHaveBeenCalledExactlyOnceWith(
        '#c=-23.55,-46.63&r=5',
      );
    });

    it('a posição falhando de novo mantém o erro', () => {
      const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
        (_, fail) => fail?.({ code: 3 } as GeolocationPositionError),
      );
      const { onHashChange } = setup({
        hash: '',
        geolocation: { getCurrentPosition },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(onHashChange).not.toHaveBeenCalled();
      expect(
        screen.getByRole('heading', { name: t.locationError.title }),
      ).toBeInTheDocument();
    });

    it('sem geolocalização no navegador, "Tentar de novo" não faz nada', () => {
      const { onHashChange } = setup({ hash: '' });

      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(onHashChange).not.toHaveBeenCalled();
    });
  });
});
