import { render, screen } from '@testing-library/react';
import MapRoute, { metadata } from './page';

vi.mock('@/features/map', () => ({
  MapPageContainer: () => <p>map-page</p>,
  mapDictionary: { metaTitle: 'Mapa de ONGs', mapLabel: 'Mapa de ONGs' },
}));

describe('/mapa', () => {
  it('compõe o mapa da feature com um título para leitores de tela', () => {
    render(<MapRoute />);

    expect(screen.getByRole('main')).toHaveTextContent('map-page');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mapa de ONGs' }),
    ).toBeInTheDocument();
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Mapa de ONGs');
  });
});
