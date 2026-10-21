import { render } from '@testing-library/react';
import { Activity } from 'react';
import { MapView } from './map-view.client';

// The real Leaflet, unlike map-view.client.spec.tsx: the bug lives in its
// container bookkeeping, which a mocked react-leaflet can't show.
function view(mode: 'visible' | 'hidden') {
  return (
    <Activity mode={mode}>
      <MapView
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        bounds={[
          [-23.6, -46.7],
          [-23.5, -46.6],
        ]}
        label="Mapa de ONGs"
        clusterLabel={(n) => `${n} ONGs nesta área`}
      />
    </Activity>
  );
}

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe('MapView no <Activity> do Next (T168, MAP-01, NGO-01)', () => {
  it('esconder e mostrar de novo não lança erro e deixa um único mapa montado', () => {
    const { container, rerender } = render(view('visible'));
    expect(container.querySelectorAll('.leaflet-container')).toHaveLength(1);

    expect(() => {
      rerender(view('hidden'));
      rerender(view('visible'));
    }).not.toThrow();

    const maps = container.querySelectorAll('.leaflet-container');
    expect(maps).toHaveLength(1);
    expect(maps[0]).toHaveAttribute('role', 'region');
    expect(maps[0]).toHaveAttribute('aria-label', 'Mapa de ONGs');
  });
});
