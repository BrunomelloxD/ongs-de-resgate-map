import { render, screen } from '@testing-library/react';
import { MapContent } from './map-content';

const getDemoInfo = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('@/features/demo', () => ({ getDemoInfo }));
vi.mock('@/features/map', () => ({
  MapPageContainer: ({
    PlaceSearch,
    start,
  }: {
    PlaceSearch: { name: string };
    start: unknown;
  }) => (
    <p>
      map-page {PlaceSearch.name} {JSON.stringify(start)}
    </p>
  ),
}));

const START = { lat: -23.5614, lng: -46.6559, radiusKm: 25 };

describe('MapContent (/mapa)', () => {
  it('demo fechada: passa o ponto inicial do /demo ao mapa (DEP-22)', async () => {
    getDemoInfo.mockResolvedValue({ locked: true, mapStart: START });

    render(await MapContent());

    expect(
      screen.getByText(`map-page MapPlaceSearch ${JSON.stringify(START)}`),
    ).toBeInTheDocument();
  });

  it('demo aberta: sem ponto inicial (DEP-23)', async () => {
    getDemoInfo.mockResolvedValue({ locked: false, mapStart: null });

    render(await MapContent());

    expect(
      screen.getByText('map-page MapPlaceSearch null'),
    ).toBeInTheDocument();
  });

  it('api fora do ar: o mapa abre sem ponto inicial', async () => {
    getDemoInfo.mockRejectedValue(new Error('GET /demo failed.'));

    render(await MapContent());

    expect(
      screen.getByText('map-page MapPlaceSearch null'),
    ).toBeInTheDocument();
  });
});
