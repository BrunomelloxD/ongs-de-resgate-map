import { render, screen, within } from '@testing-library/react';
import MapRoute, { metadata } from './page';

vi.mock('@/features/map', () => ({
  mapDictionary: { metaTitle: 'Mapa de ONGs', mapLabel: 'Mapa de ONGs' },
}));
vi.mock('./map-content', () => ({ MapContent: () => <p>map-content</p> }));

describe('/mapa', () => {
  it('compõe o mapa da feature com um título para leitores de tela', () => {
    render(<MapRoute />);

    // T187: MapContent hands the location feature's search to the map (map-content.spec).
    expect(screen.getByRole('main')).toHaveTextContent('map-content');
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
