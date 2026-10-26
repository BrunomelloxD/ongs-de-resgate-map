'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import { MapLoading } from './components/map-loading';
import type { PlaceSearch } from './map.types';

// PERF-01: Leaflet only loads on this route, and only in the browser.
// T176: the loading frame holds the screen while its chunk downloads.
const NgoMap = dynamic(
  () => import('./components/ngo-map.client').then((mod) => mod.NgoMap),
  { ssr: false, loading: () => <MapLoading /> },
);

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function replaceHash(hash: string) {
  window.history.replaceState(window.history.state, '', hash);
  // replaceState fires no event: tell the subscribers the fragment changed.
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export interface MapPageProps {
  tileUrl: string;
  attribution: string;
  /** "Cidade ou CEP" of the location feature, handed in by `app/`. */
  PlaceSearch: PlaceSearch;
}

/**
 * Wires the map to the URL fragment and the browser. The server never sees the
 * fragment (SEC-01), so nothing renders until the browser takes over.
 */
export function MapPage({ tileUrl, attribution, PlaceSearch }: MapPageProps) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => null,
  );
  if (hash === null) return null;

  return (
    <NgoMap
      tileUrl={tileUrl}
      attribution={attribution}
      hash={hash}
      onHashChange={replaceHash}
      geolocation={navigator.geolocation}
      PlaceSearch={PlaceSearch}
    />
  );
}
