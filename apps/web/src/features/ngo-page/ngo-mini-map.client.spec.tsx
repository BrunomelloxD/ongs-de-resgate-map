import { render, screen } from '@testing-library/react';
import type { MapViewProps } from '@/components/ui/map-view.client';
import { NgoMiniMap } from './ngo-mini-map.client';

const recorded = vi.hoisted(() => ({
  props: undefined as unknown as MapViewProps,
}));

vi.mock('@/components/ui/map-view.client', () => ({
  MapView: (props: MapViewProps) => {
    recorded.props = props;
    return <p>{props.label}</p>;
  },
}));

const PROPS = {
  tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  name: 'Patas do Bairro',
  lat: -23.5869,
  lng: -46.6347,
};

describe('NgoMiniMap', () => {
  it('NGO-01: mostra o pino da ONG aberta no endereço, com os tiles do servidor', async () => {
    render(<NgoMiniMap {...PROPS} openNow />);

    expect(
      await screen.findByText('Localização da Patas do Bairro'),
    ).toBeInTheDocument();
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
    render(<NgoMiniMap {...PROPS} openNow={false} />);
    await screen.findByText('Localização da Patas do Bairro');

    expect(recorded.props.markers?.[0]?.variant).toBe('closed');
  });
});
