import { render } from '@testing-library/react';
import L from 'leaflet';
import { createRef } from 'react';
import { MapContainer, Marker } from 'react-leaflet';
import { MarkerClusterGroup } from './map-cluster';

describe('MarkerClusterGroup', () => {
  it('cria o grupo do leaflet.markercluster com as opções e os marcadores filhos', async () => {
    const ref = createRef<L.MarkerClusterGroup>();

    render(
      <MapContainer center={[-23.55, -46.63]} zoom={13} maxZoom={19}>
        <MarkerClusterGroup ref={ref} maxClusterRadius={40}>
          <Marker position={[-23.55, -46.63]} />
          <Marker position={[-23.551, -46.631]} />
        </MarkerClusterGroup>
      </MapContainer>,
    );

    await vi.waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current).toBeInstanceOf(L.MarkerClusterGroup);
    expect(
      (ref.current!.options as L.MarkerClusterGroupOptions).maxClusterRadius,
    ).toBe(40);
    expect(ref.current!.getLayers()).toHaveLength(2);
  });
});
