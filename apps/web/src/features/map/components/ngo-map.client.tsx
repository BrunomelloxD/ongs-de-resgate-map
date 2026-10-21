'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet.client';
import {
  MapView,
  type LatLngBounds,
  type LatLngTuple,
  type MapViewMarker,
} from '@/components/ui/map-view.client';
import { bboxForRadius, type Bbox, type LatLng } from '@/lib/geo';
import { useIsDesktop } from '../hooks/use-is-desktop';
import { useNgoSearch } from '../hooks/use-ngo-search';
import { fetchNgos, type SearchNgos } from '../lib/fetch-ngos';
import {
  buildMapHash,
  DEFAULT_RADIUS_KM,
  parseMapHash,
  RADII,
} from '../lib/map-hash';
import { rankNgos } from '../lib/rank';
import { mapDictionary as t } from '../map.dictionary';
import type { MapSpecies, RadiusKm } from '../map.types';
import { MapFilters, type MapFilterValues } from './map-filters';
import { NgoList } from './ngo-list';
import { NgoPreviewCard } from './ngo-preview-card';

export const LOCATION_PATH = '/localizacao';
/** Same timeout as the location screen (LOC-02). */
export const GEOLOCATION_TIMEOUT_MS = 10_000;

const PRIMARY =
  'touch-target inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 font-semibold text-on-brand';
const SECONDARY =
  'touch-target inline-flex items-center justify-center rounded-full border-2 border-fg px-6 py-3 font-semibold text-fg';

const toBounds = ([minLng, minLat, maxLng, maxLat]: Bbox): LatLngBounds => [
  [minLat, minLng],
  [maxLat, maxLng],
];
const toBbox = ([[south, west], [north, east]]: LatLngBounds): Bbox => [
  west,
  south,
  east,
  north,
];

// SPEC_DEVIATION: the spec gives no precision for the fragment's center; 5 decimals (~1 m).
// Reason: keeps the fragment short and out of exponent notation, which parseMapHash rejects.
const round5 = (value: number) => Math.round(value * 1e5) / 1e5;
// SPEC_DEVIATION: a move under 1% of the visible area keeps the center.
// Reason: Leaflet rounds the view to whole pixels, so its own fit would drift the center.
const NUDGE = 0.01;

/** MAP-17: the center of the visible area becomes the center of the search. */
function centerOf(current: LatLng, [minLng, minLat, maxLng, maxLat]: Bbox) {
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  const nudge =
    Math.abs(lat - current.lat) < (maxLat - minLat) * NUDGE &&
    Math.abs(lng - current.lng) < (maxLng - minLng) * NUDGE;

  return nudge ? current : { lat: round5(lat), lng: round5(lng) };
}

type Geo = Pick<Geolocation, 'getCurrentPosition'>;

export interface NgoMapProps {
  /** `TILE_URL` and `TILE_ATTRIBUTION`, read on the server (MAP-01). */
  tileUrl: string;
  attribution: string;
  /** `location.hash`: `#c={lat},{lng}&r={km}`. It never reaches the server (SEC-01). */
  hash: string;
  /** Writes a new fragment: a new radius or a new position. */
  onHashChange: (hash: string) => void;
  /** Only called after a tap on "Tentar de novo" (LOC-03). */
  geolocation?: Geo;
  search?: SearchNgos;
}

/** The map of NGOs with its list, filters and preview (MAP, MAPF). */
export function NgoMap({ hash, ...props }: NgoMapProps) {
  const parsed = parseMapHash(hash);
  if (!parsed) {
    return (
      <LocationError
        geolocation={props.geolocation}
        onHashChange={props.onHashChange}
      />
    );
  }

  return (
    <NgoMapView center={parsed.center} radiusKm={parsed.radiusKm} {...props} />
  );
}

/** MAP-15: no usable center. */
function LocationError({
  geolocation,
  onHashChange,
}: Pick<NgoMapProps, 'geolocation' | 'onHashChange'>) {
  function retry() {
    geolocation?.getCurrentPosition(
      ({ coords }) =>
        onHashChange(
          buildMapHash(
            { lat: coords.latitude, lng: coords.longitude },
            DEFAULT_RADIUS_KM,
          ),
        ),
      // Still no position: the error stays on screen.
      () => {},
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 text-fg">
      <h2 className="font-heading text-3xl font-extrabold">
        {t.locationError.title}
      </h2>
      <p className="text-fg-secondary">{t.locationError.text}</p>
      <button type="button" className={PRIMARY} onClick={retry}>
        {t.locationError.retry}
      </button>
      <Link href={LOCATION_PATH} className={SECONDARY}>
        {t.locationError.manual}
      </Link>
    </div>
  );
}

interface NgoMapViewProps extends Omit<NgoMapProps, 'hash'> {
  center: LatLng;
  radiusKm: RadiusKm;
}

function NgoMapView({
  center,
  radiusKm,
  tileUrl,
  attribution,
  onHashChange,
  search = fetchNgos,
}: NgoMapViewProps) {
  const isDesktop = useIsDesktop();
  const [openNow, setOpenNow] = useState(false);
  const [species, setSpecies] = useState<MapSpecies[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ position: LatLngTuple }>();
  const [sheetOpen, setSheetOpen] = useState(false);

  // The map fits `frame`. A move writes its own fragment, which must not fit again.
  const hash = buildMapHash(center, radiusKm);
  const [frame, setFrame] = useState({
    hash,
    center,
    radiusKm,
    visitor: center,
  });
  // The visible area after a move; it belongs to one frame.
  const [moved, setMoved] = useState<{
    frame: string;
    hash: string;
    center: LatLng;
    bbox: Bbox;
  }>();
  const visible = moved?.frame === frame.hash ? moved : undefined;
  const searchCenter = visible?.center ?? frame.center;

  if (hash !== frame.hash && hash !== visible?.hash) {
    // A new radius or a fragment edited by hand: fit again. Only a new place moves the visitor pin.
    const samePlace =
      center.lat === searchCenter.lat && center.lng === searchCenter.lng;
    setFrame({
      hash,
      center,
      radiusKm,
      visitor: samePlace ? frame.visitor : center,
    });
  }

  const radiusBbox = bboxForRadius(frame.center, frame.radiusKm);
  const result = useNgoSearch(visible?.bbox ?? radiusBbox, species, search);
  const ranked = rankNgos(result.items, searchCenter, { openNow, radiusKm });
  const selected = ranked.find((ngo) => ngo.id === selectedId);

  const { lat, lng } = searchCenter;
  const handleMoveEnd = useCallback(
    (bounds: LatLngBounds) => {
      const bbox = toBbox(bounds);
      const next = centerOf({ lat, lng }, bbox);
      const nextHash = buildMapHash(next, radiusKm);
      setMoved({ frame: frame.hash, hash: nextHash, center: next, bbox });
      // SEC-01: the center only goes to the fragment, never to the server.
      if (nextHash !== hash) onHashChange(nextHash);
    },
    [lat, lng, radiusKm, frame.hash, hash, onHashChange],
  );

  function setRadius(next: RadiusKm) {
    if (next !== radiusKm) onHashChange(buildMapHash(searchCenter, next));
  }

  function handleFilters(next: MapFilterValues) {
    setOpenNow(next.openNow);
    setSpecies(next.species);
    setRadius(next.radiusKm);
  }

  function selectFromList(id: string) {
    const ngo = ranked.find((item) => item.id === id)!;
    setSelectedId(id);
    setFocus({ position: [ngo.lat, ngo.lng] });
    // Show the map: the pin and its preview are under the sheet.
    setSheetOpen(false);
  }

  const wider = RADII[RADII.indexOf(radiusKm) + 1];
  const markers: MapViewMarker[] = ranked.map((ngo) => ({
    id: ngo.id,
    position: [ngo.lat, ngo.lng],
    variant:
      ngo.id === selectedId ? 'selected' : ngo.openNow ? 'open' : 'closed',
    label: t.pinLabel(ngo.name, ngo.openNow),
  }));

  const panel = (
    <div className="flex flex-col gap-6">
      <MapFilters
        value={{ openNow, radiusKm, species }}
        onChange={handleFilters}
      />
      <NgoList
        status={result.status}
        items={ranked}
        radiusKm={radiusKm}
        filtered={openNow || species.length > 0}
        truncated={result.truncated}
        selectedId={selectedId}
        onSelect={selectFromList}
        onRetry={result.retry}
        onWiden={wider ? () => setRadius(wider) : undefined}
        onClearFilters={() =>
          handleFilters({
            openNow: false,
            radiusKm: DEFAULT_RADIUS_KM,
            species: [],
          })
        }
        otherCityHref={LOCATION_PATH}
      />
    </div>
  );

  return (
    <div data-slot="ngo-map" className="flex min-h-0 flex-1">
      {isDesktop && (
        <aside
          aria-label={t.list.label}
          className="w-[440px] shrink-0 overflow-y-auto bg-page px-6 py-6"
        >
          {panel}
        </aside>
      )}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MapView
          tileUrl={tileUrl}
          attribution={attribution}
          bounds={toBounds(radiusBbox)}
          label={t.mapLabel}
          clusterLabel={t.clusterLabel}
          markers={markers}
          visitor={[frame.visitor.lat, frame.visitor.lng]}
          onSelect={setSelectedId}
          onMoveEnd={handleMoveEnd}
          focus={focus}
        />
        {selected && (
          <div className="absolute inset-x-4 top-4 z-[1000] mx-auto max-w-sm">
            <NgoPreviewCard ngo={selected} className="pr-14" />
            <button
              type="button"
              aria-label={t.preview.close}
              onClick={() => setSelectedId(null)}
              className="touch-target absolute top-2 right-2 inline-flex items-center justify-center rounded-full text-fg"
            >
              <X aria-hidden="true" className="size-6" />
            </button>
          </div>
        )}
        {!isDesktop && (
          <BottomSheet
            label={t.list.label}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
          >
            {panel}
          </BottomSheet>
        )}
      </div>
    </div>
  );
}
