import {
  createElementObject,
  createLayerComponent,
  extendContext,
  type LayerProps,
} from '@react-leaflet/core';
import L from 'leaflet';
// Plugin: reads the global L that leaflet sets, so it must come after it.
import 'leaflet.markercluster';

export interface MarkerClusterGroupProps
  extends L.MarkerClusterGroupOptions, LayerProps {
  children?: React.ReactNode;
}

/** react-leaflet wrapper for leaflet.markercluster: child `<Marker>`s join the group. */
export const MarkerClusterGroup = createLayerComponent<
  L.MarkerClusterGroup,
  MarkerClusterGroupProps
>(function createMarkerClusterGroup({ children: _children, ...options }, ctx) {
  const group = L.markerClusterGroup(options);

  return createElementObject(
    group,
    extendContext(ctx, { layerContainer: group }),
  );
});
