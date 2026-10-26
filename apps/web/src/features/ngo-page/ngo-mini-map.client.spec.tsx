import { Activity } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { MapViewProps } from '@/components/ui/map-view.client';
import { NgoMiniMap } from './ngo-mini-map.client';

const recorded = vi.hoisted(() => ({
  props: undefined as unknown as MapViewProps,
}));

vi.mock('@/components/ui/map-view.client', () => ({
  MapView: (props: MapViewProps) => {
    recorded.props = props;
    return <p className={props.className}>{props.label}</p>;
  },
}));

const PROPS = {
  tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  name: 'Patas do Bairro',
  lat: -23.5869,
  lng: -46.6347,
};

/** jsdom has no IntersectionObserver: records the observers and lets the test fire them. */
const observers: {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  target?: Element;
  disconnect: ReturnType<typeof vi.fn<() => void>>;
}[] = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly entry: (typeof observers)[number];
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        this.entry = { callback, options, disconnect: vi.fn<() => void>() };
        observers.push(this.entry);
      }
      observe(target: Element) {
        this.entry.target = target;
      }
      disconnect() {
        this.entry.disconnect();
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function intersect(isIntersecting: boolean) {
  const [observer] = observers;
  act(() =>
    observer!.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
}

async function renderVisible(openNow: boolean) {
  render(<NgoMiniMap {...PROPS} openNow={openNow} />);
  intersect(true);
  await screen.findByText('Localização da Patas do Bairro');
}

describe('NgoMiniMap', () => {
  it('NGO-01: mostra o pino da ONG aberta no endereço, com os tiles do servidor', async () => {
    await renderVisible(true);

    expect(recorded.props).toMatchObject({
      tileUrl: PROPS.tileUrl,
      attribution: PROPS.attribution,
      markers: [
        {
          id: 'ngo',
          position: [-23.5869, -46.6347],
          variant: 'open',
          label: 'Patas do Bairro',
        },
      ],
    });
    expect(recorded.props.clusterLabel(2)).toBe('2 ONGs nesta área');
    const [[south, west], [north, east]] = recorded.props.bounds;
    expect(south).toBeLessThan(PROPS.lat);
    expect(north).toBeGreaterThan(PROPS.lat);
    expect(west).toBeLessThan(PROPS.lng);
    expect(east).toBeGreaterThan(PROPS.lng);
  });

  it('ONG fechada → pino "closed"', async () => {
    await renderVisible(false);

    expect(recorded.props.markers?.[0]?.variant).toBe('closed');
  });

  it('PERF-04/T176: fora da área visível, não monta o MapView e mostra a moldura do mesmo tamanho', () => {
    const { container } = render(<NgoMiniMap {...PROPS} openNow />);
    intersect(false);

    expect(
      screen.queryByText('Localização da Patas do Bairro'),
    ).not.toBeInTheDocument();
    const frame = container.querySelector('[data-slot="ngo-mini-map-frame"]')!;
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    // Same box as the map: both fill the h-52 slot of NgoProfile.
    expect(frame).toHaveClass('size-full');
    // Starts a little before the slot scrolls into view.
    expect(observers[0]!.options).toEqual({ rootMargin: '200px' });
    expect(observers[0]!.target).toBe(frame);
  });

  it('T176: ao chegar perto da área visível, troca a moldura pelo mapa e para de observar', async () => {
    const { container } = render(<NgoMiniMap {...PROPS} openNow />);

    intersect(true);

    // The map takes the frame's box.
    expect(
      await screen.findByText('Localização da Patas do Bairro'),
    ).toHaveClass('size-full');
    expect(
      container.querySelector('[data-slot="ngo-mini-map-frame"]'),
    ).toBeNull();
    expect(observers[0]!.disconnect).toHaveBeenCalled();
  });

  it('T176: escondido e mostrado de novo pelo <Activity> (voltar), o mapa continua sem observar de novo', async () => {
    const view = render(
      <Activity mode="visible">
        <NgoMiniMap {...PROPS} openNow />
      </Activity>,
    );
    intersect(true);
    await screen.findByText('Localização da Patas do Bairro');

    view.rerender(
      <Activity mode="hidden">
        <NgoMiniMap {...PROPS} openNow />
      </Activity>,
    );
    view.rerender(
      <Activity mode="visible">
        <NgoMiniMap {...PROPS} openNow />
      </Activity>,
    );

    expect(
      await screen.findByText('Localização da Patas do Bairro'),
    ).toBeVisible();
    expect(observers).toHaveLength(1);
  });
});
