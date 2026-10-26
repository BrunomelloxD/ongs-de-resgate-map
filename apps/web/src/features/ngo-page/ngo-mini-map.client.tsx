'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { bboxForRadius } from '@/lib/geo';
import { ngoPageDictionary } from './ngo-page.dictionary';

const t = ngoPageDictionary.profile;

// PERF-01: Leaflet loads only in the browser, after the page.
const MapView = dynamic(
  () => import('@/components/ui/map-view.client').then((mod) => mod.MapView),
  { ssr: false },
);

const RADIUS_KM = 0.4;
// PERF-04 (T176): Leaflet and the tiles start a little before the map scrolls into view.
const NEAR_VIEW = { rootMargin: '200px' };

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
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    // Back from a hidden <Activity>, the map is already there: nothing to observe.
    if (near) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setNear(true);
    }, NEAR_VIEW);
    observer.observe(frame.current!);
    return () => observer.disconnect();
  }, [near]);

  const [minLng, minLat, maxLng, maxLat] = bboxForRadius(
    { lat, lng },
    RADIUS_KM,
  );

  if (!near) {
    // Same box as the map, so nothing moves when it arrives.
    return (
      <div
        ref={frame}
        data-slot="ngo-mini-map-frame"
        aria-hidden="true"
        className="size-full bg-subtle"
      />
    );
  }

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
