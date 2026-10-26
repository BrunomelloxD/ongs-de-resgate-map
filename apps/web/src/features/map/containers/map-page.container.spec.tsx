import { render, screen } from '@testing-library/react';
import type { MapPageProps } from '../map-page.client';
import { FakePlaceSearch } from '../test-place-search';
import { MapPageContainer } from './map-page.container';

vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
const { preconnect } = vi.hoisted(() => ({ preconnect: vi.fn() }));
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preconnect,
}));
vi.mock('../map-page.client', () => ({
  MapPage: ({ tileUrl, attribution, PlaceSearch }: MapPageProps) => (
    <p>
      {tileUrl} | {attribution} | {PlaceSearch.name}
    </p>
  ),
}));

describe('MapPageContainer', () => {
  it('MAP-01: passa TILE_URL e TILE_ATTRIBUTION do ambiente ao mapa', async () => {
    render(await MapPageContainer({ PlaceSearch: FakePlaceSearch }));

    // T187: the place search handed in by app/ goes along.
    expect(
      screen.getByText(
        'http://tiles.test/{z}/{x}/{y}.png | © OpenStreetMap contributors | FakePlaceSearch',
      ),
    ).toBeInTheDocument();
  });

  it('PERF-04/T176: pré-conecta à origem do TILE_URL', async () => {
    render(await MapPageContainer({ PlaceSearch: FakePlaceSearch }));

    expect(preconnect).toHaveBeenCalledWith('http://tiles.test');
  });
});
