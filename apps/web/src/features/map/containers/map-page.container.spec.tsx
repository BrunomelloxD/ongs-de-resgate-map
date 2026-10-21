import { render, screen } from '@testing-library/react';
import type { MapPageProps } from '../map-page.client';
import { MapPageContainer } from './map-page.container';

vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('../map-page.client', () => ({
  MapPage: ({ tileUrl, attribution }: MapPageProps) => (
    <p>
      {tileUrl} | {attribution}
    </p>
  ),
}));

describe('MapPageContainer', () => {
  it('MAP-01: passa TILE_URL e TILE_ATTRIBUTION do ambiente ao mapa', async () => {
    render(await MapPageContainer());

    expect(
      screen.getByText(
        'http://tiles.test/{z}/{x}/{y}.png | © OpenStreetMap contributors',
      ),
    ).toBeInTheDocument();
  });
});
