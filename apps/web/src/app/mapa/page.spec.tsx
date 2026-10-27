import { render, screen, within } from '@testing-library/react';
import MapRoute, { metadata } from './page';

vi.mock('@/features/map', () => ({
  MapPageContainer: ({ PlaceSearch }: { PlaceSearch: { name: string } }) => (
    <p>map-page {PlaceSearch.name}</p>
  ),
  mapDictionary: { metaTitle: 'Mapa de ONGs', mapLabel: 'Mapa de ONGs' },
}));

describe('/mapa', () => {
  it('compõe o mapa da feature com um título para leitores de tela', () => {
    render(<MapRoute />);

    // T187: the map gets the location feature's search from here.
    expect(screen.getByRole('main')).toHaveTextContent(
      'map-page MapPlaceSearch',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mapa de ONGs' }),
    ).toBeInTheDocument();
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Mapa de ONGs');
  });

  it('T196: a navbar fica sempre "Rolada", com "Mapa de ONGs" como página atual', () => {
    render(<MapRoute />);
    const banner = screen.getByRole('banner');

    expect(banner).toHaveAttribute('data-raised', 'true');
    expect(
      within(banner).getByRole('link', { name: 'Mapa de ONGs' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });
});
