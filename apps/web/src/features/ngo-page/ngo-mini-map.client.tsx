'use client';

import dynamic from 'next/dynamic';
import { bboxForRadius } from '@/lib/geo';
import { ngoPageDictionary } from './ngo-page.dictionary';

const t = ngoPageDictionary.profile;

// PERF-01: Leaflet loads only in the browser, after the page.
const MapView = dynamic(
  () => import('@/components/ui/map-view.client').then((mod) => mod.MapView),
  { ssr: false },
);

const RADIUS_KM = 0.4;

export interface NgoMiniMapProps {
  tileUrl: string;
  attribution: string;
  name: string;
  lat: number;
  lng: number;
  openNow: boolean;
}

/**
 * The address map of the NGO page (NGO-01). Kept out of `components/` because
 * Storybook can't load Leaflet through next/dynamic.
 */
export function NgoMiniMap({
  tileUrl,
  attribution,
  name,
  lat,
  lng,
  openNow,
}: NgoMiniMapProps) {
  const [minLng, minLat, maxLng, maxLat] = bboxForRadius(
    { lat, lng },
    RADIUS_KM,
  );

  return (
    <MapView
      tileUrl={tileUrl}
      attribution={attribution}
      label={t.miniMapLabel(name)}
      // A single pin never clusters; MapView still needs the label.
      clusterLabel={t.miniMapCluster}
      bounds={[
        [minLat, minLng],
        [maxLat, maxLng],
      ]}
      markers={[
        {
          id: 'ngo',
          position: [lat, lng],
          variant: openNow ? 'open' : 'closed',
          label: name,
        },
      ]}
      className="size-full"
    />
  );
}
