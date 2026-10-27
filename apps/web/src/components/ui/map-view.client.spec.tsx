import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type L from 'leaflet';
import {
  clusterIcon,
  MapView,
  pinIcon,
  type MapViewMarker,
  type MapViewProps,
} from './map-view.client';

type Props = Record<string, unknown>;
type Handlers = Record<string, (event: unknown) => void>;

const recorded = vi.hoisted(() => ({
  map: {} as Props,
  tiles: {} as Props,
  zoom: {} as Props,
  cluster: {} as Props,
  fitBounds: vi.fn(),
  panTo: vi.fn(),
  listeners: new Map<string, () => void>(),
  container: undefined as unknown as HTMLDivElement,
  circle: undefined as Props | undefined,
  point: { x: 400, y: 400 },
  size: { x: 800, y: 600 },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    ...props
  }: Props & { children: React.ReactNode }) => {
    recorded.map = props;
    return <div data-testid="map">{children}</div>;
  },
  Circle: (props: Props) => {
    recorded.circle = props;
    return null;
  },
  TileLayer: (props: Props) => {
    recorded.tiles = props;
    return null;
  },
  ZoomControl: (props: Props) => {
    recorded.zoom = props;
    return null;
  },
  Marker: ({
    icon,
    eventHandlers,
    zIndexOffset,
  }: {
    icon: L.DivIcon;
    eventHandlers?: Handlers;
    zIndexOffset?: number;
  }) => (
    // Mirrors what Leaflet does to a keyboard marker: role="button" + tabindex.
    <div
      role="button"
      tabIndex={0}
      data-z={zIndexOffset}
      onClick={() => eventHandlers?.['click']?.({})}
      onKeyDown={(e) =>
        eventHandlers?.['keydown']?.({ originalEvent: e.nativeEvent })
      }
      dangerouslySetInnerHTML={{ __html: icon.options.html as string }}
    />
  ),
  useMap: () => ({
    getContainer: () => recorded.container,
    fitBounds: recorded.fitBounds,
    panTo: recorded.panTo,
    on: (type: string, fn: () => void) => recorded.listeners.set(type, fn),
    off: (type: string) => recorded.listeners.delete(type),
    latLngToContainerPoint: () => recorded.point,
    getSize: () => recorded.size,
    getBounds: () => ({
      getSouth: () => -23.61,
      getWest: () => -46.72,
      getNorth: () => -23.49,
      getEast: () => -46.58,
    }),
  }),
}));

vi.mock('./map-cluster', () => ({
  MarkerClusterGroup: ({
    children,
    ...props
  }: Props & { children: React.ReactNode }) => {
    recorded.cluster = props;
    return <div data-testid="cluster">{children}</div>;
  },
}));

const MARKERS: MapViewMarker[] = [
  {
    id: 'a',
    position: [-23.55, -46.63],
    variant: 'open',
    label: 'Patas do Bairro, aberta agora',
  },
  {
    id: 'b',
    position: [-23.551, -46.631],
    variant: 'closed',
    label: 'Gatil Sete Vidas, fechada agora',
  },
  {
    id: 'c',
    position: [-23.552, -46.632],
    variant: 'selected',
    label: 'Lar do Caramelo, selecionada',
  },
];

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn(() => ({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function renderMap(props: Partial<MapViewProps> = {}) {
  return render(
    <MapView
      tileUrl="http://tiles.test/{z}/{x}/{y}.png"
      attribution="© OpenStreetMap contributors"
      bounds={[
        [-23.6, -46.7],
        [-23.5, -46.6],
      ]}
      label="Mapa de ONGs"
      clusterLabel={(n) => `${n} ONGs nesta área`}
      markers={MARKERS}
      {...props}
    />,
  );
}

beforeEach(() => {
  recorded.fitBounds.mockClear();
  recorded.panTo.mockClear();
  recorded.listeners.clear();
  recorded.container = document.createElement('div');
  recorded.circle = undefined;
  recorded.point = { x: 400, y: 400 };
  recorded.size = { x: 800, y: 600 };
  mockReducedMotion(false);
});

describe('MapView', () => {
  it('repassa a URL dos tiles e a atribuição (MAP-01)', () => {
    renderMap();

    expect(recorded.tiles['url']).toBe('http://tiles.test/{z}/{x}/{y}.png');
    expect(recorded.tiles['attribution']).toBe('© OpenStreetMap contributors');
  });

  it('A11Y-07/T177: troca o zoom do Leaflet (em inglês) por um com "Aproximar" e "Afastar"', () => {
    renderMap();

    expect(recorded.map['zoomControl']).toBe(false);
    expect(recorded.zoom).toEqual({
      zoomInTitle: 'Aproximar',
      zoomOutTitle: 'Afastar',
    });
  });

  it('por padrão o mapa se move: arrastar, zoom por gesto e por teclado ligados', () => {
    renderMap();

    expect(recorded.map).toMatchObject({
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
    });
  });

  it('DEP-60: fixed desliga arrastar, todo zoom e os botões de zoom', () => {
    recorded.zoom = {};
    renderMap({ fixed: true });

    expect(recorded.map).toMatchObject({
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    expect(recorded.zoom).toEqual({});
  });

  it('agrupa os pinos com maxClusterRadius: 40 (MAP-04)', () => {
    renderMap();

    expect(recorded.cluster['maxClusterRadius']).toBe(40);
    expect(screen.getByTestId('cluster').children).toHaveLength(3);
  });

  it('o cluster mostra a quantidade e tem rótulo acessível', () => {
    renderMap();
    const create = recorded.cluster['iconCreateFunction'] as (
      c: Pick<L.MarkerCluster, 'getChildCount'>,
    ) => L.DivIcon;

    const icon = create({ getChildCount: () => 3 });
    const holder = document.createElement('div');
    holder.innerHTML = icon.options.html as string;

    expect(holder.textContent).toBe('3');
    expect(holder.firstElementChild).toHaveAttribute(
      'aria-label',
      '3 ONGs nesta área',
    );
  });

  it('Enter num cluster focado aproxima o mapa; outra tecla não', () => {
    renderMap();
    const handlers = recorded.cluster['eventHandlers'] as Handlers;
    const zoomToBounds = vi.fn();

    handlers['clusterkeydown']!({
      originalEvent: { key: ' ' },
      layer: { zoomToBounds },
    });
    expect(zoomToBounds).not.toHaveBeenCalled();
    handlers['clusterkeydown']!({
      originalEvent: { key: 'Enter' },
      layer: { zoomToBounds },
    });
    expect(zoomToBounds).toHaveBeenCalledOnce();
  });

  it('cada pino é focável e tem o rótulo da variante (MAP-03)', () => {
    renderMap();

    for (const marker of MARKERS) {
      const pin = screen.getByRole('img', { name: marker.label });
      expect(pin).toHaveAttribute('data-variant', marker.variant);
      expect(pin.closest('[role="button"]')).toHaveAttribute('tabindex', '0');
    }
  });

  it('Enter no pino chama onSelect com o id (A11Y-08)', async () => {
    const onSelect = vi.fn();
    renderMap({ onSelect });

    await userEvent.tab();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Gatil Sete Vidas, fechada agora' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
  });

  it('outra tecla no pino não seleciona', async () => {
    const onSelect = vi.fn();
    renderMap({ onSelect });

    await userEvent.tab();
    await userEvent.keyboard('a');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('toque no pino chama onSelect', async () => {
    const onSelect = vi.fn();
    renderMap({ onSelect });

    await userEvent.click(
      screen.getByRole('button', { name: 'Patas do Bairro, aberta agora' }),
    );

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('a');
  });

  it('sem onSelect, tocar ou dar Enter no pino não quebra', async () => {
    renderMap();
    const pin = screen.getByRole('button', {
      name: 'Patas do Bairro, aberta agora',
    });

    await userEvent.click(pin);
    await userEvent.keyboard('{Enter}');

    expect(pin).toBeInTheDocument();
  });

  it('o pino selecionado fica por cima dos outros', () => {
    renderMap();

    expect(
      screen
        .getByRole('img', { name: 'Lar do Caramelo, selecionada' })
        .closest('[role="button"]'),
    ).toHaveAttribute('data-z', '1000');
    expect(
      screen
        .getByRole('img', { name: 'Patas do Bairro, aberta agora' })
        .closest('[role="button"]'),
    ).toHaveAttribute('data-z', '0');
  });

  it('mostra a posição do visitante fora do cluster', () => {
    renderMap({ visitor: [-23.56, -46.64] });

    const visitor = screen.getByRole('img', { name: 'Sua localização' });
    expect(screen.getByTestId('cluster')).not.toContainElement(visitor);
  });

  it('sem visitante nem marcadores, renderiza só o mapa', () => {
    renderMap({ markers: undefined });

    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  describe('M-06: card ancorado num ponto', () => {
    const anchored = {
      position: [-23.55, -46.63] as [number, number],
      content: <p>prévia</p>,
    };
    const card = () =>
      document.querySelector<HTMLElement>('[data-slot="map-anchored"]')!;

    it('fica acima do ponto, centralizado, com até 360 px', () => {
      renderMap({ anchored });

      expect(screen.getByText('prévia')).toBeInTheDocument();
      expect(card()).toHaveAttribute('data-placement', 'above');
      expect(card()).toHaveStyle({
        left: '220px',
        width: '360px',
        top: '326px',
      });
    });

    it('perto do topo vai para baixo do ponto e fica dentro das bordas do mapa', () => {
      recorded.point = { x: 30, y: 100 };
      recorded.size = { x: 390, y: 700 };
      renderMap({ anchored });

      expect(card()).toHaveAttribute('data-placement', 'below');
      expect(card()).toHaveStyle({
        left: '16px',
        width: '358px',
        top: '112px',
      });
    });

    it('segue o mapa: um movimento reposiciona o card', () => {
      renderMap({ anchored });
      recorded.point = { x: 500, y: 450 };

      act(() => recorded.listeners.get('move zoom resize')!());

      expect(card()).toHaveStyle({ left: '320px', top: '376px' });
    });

    it('um toque no card não chega ao mapa', () => {
      renderMap({ anchored });
      const onMapPress = vi.fn();
      card().parentElement!.addEventListener('mousedown', onMapPress);

      fireEvent.mouseDown(screen.getByText('prévia'));

      expect(onMapPress).not.toHaveBeenCalled();
      // Leaflet's own flag: its click handler skips the card.
      expect(
        (card() as unknown as Record<string, unknown>)[
          '_leaflet_disable_click'
        ],
      ).toBe(true);
    });

    it('para de seguir o mapa ao sair', () => {
      const { unmount } = renderMap({ anchored });

      unmount();

      expect(recorded.listeners.has('move zoom resize')).toBe(false);
    });
  });

  it('M-11: desenha o círculo tracejado do raio, sem interação', () => {
    renderMap({ circle: { center: [-23.55, -46.63], radiusM: 5000 } });

    expect(recorded.circle).toMatchObject({
      center: [-23.55, -46.63],
      radius: 5000,
      interactive: false,
      className: 'stroke-brand-deep fill-brand-deep',
      pathOptions: { dashArray: '6 8' },
    });
  });

  it('renderiza camadas extras recebidas como filhos', () => {
    renderMap({ children: <p>camada extra</p> });

    expect(screen.getByText('camada extra')).toBeInTheDocument();
  });

  it('enquadra os limites com fitBounds e dá nome ao mapa', () => {
    renderMap();

    expect(recorded.fitBounds).toHaveBeenCalledWith(
      [
        [-23.6, -46.7],
        [-23.5, -46.6],
      ],
      { animate: true },
    );
    expect(recorded.container).toHaveAttribute('role', 'region');
    expect(recorded.container).toHaveAttribute('aria-label', 'Mapa de ONGs');
    expect(recorded.map['maxZoom']).toBe(19);
  });

  it('sublinha os links da atribuição, com as cores do tema (A11Y-01)', () => {
    renderMap();

    expect(recorded.map['className']).toContain(
      '[&_.leaflet-control-attribution_a]:underline!',
    );
    expect(recorded.map['className']).toContain(
      '[&_.leaflet-control-attribution_a]:text-brand-text!',
    );
  });

  it('enquadra de novo quando os limites mudam', () => {
    const { rerender } = renderMap();
    recorded.fitBounds.mockClear();

    act(() =>
      rerender(
        <MapView
          tileUrl="http://tiles.test/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
          bounds={[
            [-22.9, -43.3],
            [-22.8, -43.1],
          ]}
          label="Mapa de ONGs"
          clusterLabel={(n) => `${n} ONGs`}
        />,
      ),
    );

    expect(recorded.fitBounds).toHaveBeenCalledWith(
      [
        [-22.9, -43.3],
        [-22.8, -43.1],
      ],
      { animate: true },
    );
  });

  it('com movimento, as animações do mapa e do cluster ficam ligadas', () => {
    renderMap();

    expect(recorded.map).toMatchObject({
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });
    expect(recorded.cluster['animate']).toBe(true);
  });

  it('prefers-reduced-motion desliga as animações do mapa (A11Y-09)', () => {
    mockReducedMotion(true);
    renderMap();

    expect(recorded.map).toMatchObject({
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      inertia: false,
    });
    expect(recorded.cluster['animate']).toBe(false);
    expect(recorded.fitBounds).toHaveBeenCalledWith(expect.anything(), {
      animate: false,
    });
  });
});

describe('MapView: área visível e foco', () => {
  it('MAP-17: cada fim de movimento informa a área visível', () => {
    const onMoveEnd = vi.fn();
    renderMap({ onMoveEnd });

    act(() => recorded.listeners.get('moveend')!());

    expect(onMoveEnd).toHaveBeenCalledExactlyOnceWith([
      [-23.61, -46.72],
      [-23.49, -46.58],
    ]);
  });

  it('para de informar ao desmontar', () => {
    const { unmount } = renderMap({ onMoveEnd: vi.fn() });

    unmount();

    expect(recorded.listeners.has('moveend')).toBe(false);
  });

  it('sem onMoveEnd, não escuta o movimento', () => {
    renderMap();

    expect(recorded.listeners.has('moveend')).toBe(false);
  });

  it('MAP-10: um foco novo centraliza o mapa no ponto, mesmo repetido', () => {
    const { rerender } = renderMap({ focus: { position: [-23.58, -46.63] } });
    expect(recorded.panTo).toHaveBeenCalledExactlyOnceWith([-23.58, -46.63], {
      animate: true,
    });

    rerender(
      <MapView
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        bounds={[
          [-23.6, -46.7],
          [-23.5, -46.6],
        ]}
        label="Mapa de ONGs"
        clusterLabel={(n) => `${n} ONGs nesta área`}
        focus={{ position: [-23.58, -46.63] }}
      />,
    );

    expect(recorded.panTo).toHaveBeenCalledTimes(2);
  });

  it('MAP-17: o movimento do foco não conta como movimento do visitante', () => {
    const onMoveEnd = vi.fn();
    renderMap({ onMoveEnd, focus: { position: [-23.58, -46.63] } });

    act(() => recorded.listeners.get('moveend')!());
    expect(onMoveEnd).not.toHaveBeenCalled();

    act(() => recorded.listeners.get('moveend')!());
    expect(onMoveEnd).toHaveBeenCalledOnce();
  });

  it('dois focos seguidos → os dois movimentos são ignorados', () => {
    const onMoveEnd = vi.fn();
    const { rerender } = renderMap({
      onMoveEnd,
      focus: { position: [-23.58, -46.63] },
    });
    rerender(
      <MapView
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        bounds={[
          [-23.6, -46.7],
          [-23.5, -46.6],
        ]}
        label="Mapa de ONGs"
        clusterLabel={(n) => `${n} ONGs nesta área`}
        onMoveEnd={onMoveEnd}
        focus={{ position: [-23.57, -46.62] }}
      />,
    );

    act(() => recorded.listeners.get('moveend')!());
    act(() => recorded.listeners.get('moveend')!());
    expect(onMoveEnd).not.toHaveBeenCalled();

    act(() => recorded.listeners.get('moveend')!());
    expect(onMoveEnd).toHaveBeenCalledOnce();
  });

  it('A11Y-09: com prefers-reduced-motion, centraliza sem animar', () => {
    mockReducedMotion(true);
    renderMap({ focus: { position: [-23.58, -46.63] } });

    expect(recorded.panTo).toHaveBeenCalledWith([-23.58, -46.63], {
      animate: false,
    });
  });
});

describe('ícones', () => {
  it('a ponta da gota fica na coordenada; o círculo do visitante, no centro', () => {
    // T173/T181: the 30×39 drop of the Design System sits at the bottom centre of a 44×44 box.
    expect(pinIcon('open').options.iconAnchor).toEqual([22, 44]);
    expect(pinIcon('visitor').options.iconAnchor).toEqual([22, 22]);
  });

  it.each([
    ['open', [44, 44], [30, 39]],
    ['closed', [44, 44], [30, 39]],
    ['selected', [48, 62], [48, 62]],
  ] as const)(
    'A11Y-02: o pino %s tem área de foco de 44×44 ou mais, e o desenho mantém o tamanho do design',
    (variant, box, drawing) => {
      const { iconSize, iconAnchor, html } = pinIcon(variant).options;
      const holder = document.createElement('div');
      holder.innerHTML = html as string;
      const svg = holder.querySelector('svg')!;

      expect(iconSize).toEqual(box);
      expect(iconAnchor).toEqual([box[0] / 2, box[1]]);
      expect([
        Number(svg.getAttribute('width')),
        Number(svg.getAttribute('height')),
      ]).toEqual(drawing);
      // Bottom centre of the box: the drawing's tip is the anchor.
      expect(svg.parentElement!.className).toBe(
        'flex size-full items-end justify-center',
      );
    },
  );

  it('o pino selecionado desenha a foto da ONG recebida', () => {
    const { html } = pinIcon('selected', 'Patas', '/img/patas.webp').options;

    expect(html).toContain('href="/img/patas.webp"');
  });

  it('o ícone do cluster tem 44 px', () => {
    expect(clusterIcon(2, '2 ONGs').options.iconSize).toEqual([44, 44]);
  });
});
