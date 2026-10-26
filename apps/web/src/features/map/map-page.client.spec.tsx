import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { NgoMapProps } from './components/ngo-map.client';
import { MapPage } from './map-page.client';
import { FakePlaceSearch } from './test-place-search';

const recorded = vi.hoisted(() => ({
  props: undefined as unknown as NgoMapProps,
}));

vi.mock('./components/ngo-map.client', () => ({
  NgoMap: (props: NgoMapProps) => {
    recorded.props = props;
    return <p>ngo-map {props.hash}</p>;
  },
}));

const TILES = {
  tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  PlaceSearch: FakePlaceSearch,
};

beforeEach(() => {
  window.history.replaceState(null, '', '/mapa#c=-23.5869,-46.6347&r=5');
});

describe('MapPage', () => {
  it('passa o fragmento da URL, os tiles e a geolocalização ao mapa', async () => {
    render(<MapPage {...TILES} />);

    expect(
      await screen.findByText('ngo-map #c=-23.5869,-46.6347&r=5'),
    ).toBeInTheDocument();
    expect(recorded.props).toMatchObject(TILES);
    expect(recorded.props.geolocation).toBe(navigator.geolocation);
  });

  it('T176: mostra a moldura "Procurando ONGs perto de você…" antes do Leaflet chegar', async () => {
    // next/dynamic keeps the loaded chunk per module: start from a fresh one.
    vi.resetModules();
    const { MapPage: FreshMapPage } = await import('./map-page.client');
    render(<FreshMapPage {...TILES} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Procurando ONGs perto de você…',
    );
    expect(screen.queryByText(/ngo-map/)).not.toBeInTheDocument();
    expect(await screen.findByText(/ngo-map/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('MAP-14: um raio novo vai para o fragmento, sem sair da página', async () => {
    render(<MapPage {...TILES} />);
    await screen.findByText(/ngo-map/);

    act(() => recorded.props.onHashChange('#c=-23.5869,-46.6347&r=10'));

    expect(window.location.pathname).toBe('/mapa');
    expect(window.location.hash).toBe('#c=-23.5869,-46.6347&r=10');
    expect(
      screen.getByText('ngo-map #c=-23.5869,-46.6347&r=10'),
    ).toBeInTheDocument();
  });

  it('acompanha o fragmento editado à mão', async () => {
    render(<MapPage {...TILES} />);
    await screen.findByText(/ngo-map/);

    act(() => {
      window.location.hash = '#c=-22.9,-43.2&r=5';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByText('ngo-map #c=-22.9,-43.2&r=5')).toBeInTheDocument();
  });

  it('SEC-01: no servidor não renderiza nada (o fragmento só existe no navegador)', () => {
    expect(renderToString(<MapPage {...TILES} />)).toBe('');
  });
});
