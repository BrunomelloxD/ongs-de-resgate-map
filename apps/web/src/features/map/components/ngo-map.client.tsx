'use client';

import { LocateFixed, SlidersHorizontal, X } from 'lucide-react';
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
import type { MapSpecies, PlaceSearch, RadiusKm } from '../map.types';
import { LocationErrorPanel } from './location-error-panel';
import { MapFilters, type MapFilterValues } from './map-filters';
import { NgoList } from './ngo-list';
import { NgoPreviewCard } from './ngo-preview-card';

export const LOCATION_PATH = '/localizacao';
/** Same timeout as the location screen (LOC-02). */
export const GEOLOCATION_TIMEOUT_MS = 10_000;

/** MAP-15: with no center, the map shows Brazil behind the error. */
export const BRAZIL_BOUNDS: LatLngBounds = [
  [-33.75, -73.99],
  [5.27, -34.79],
];

// Figcraft 03-mapa-* (390 px): what the collapsed sheet shows, handle included.
const PEEK = {
  ready: '14rem',
  loading: '18rem',
  empty: '26rem',
  error: '12rem',
} as const;
/** The search bar and "Centralizar em mim" take the top 140 px of the phone's map. */
const PHONE_CONTROLS_PX = 140;
/** Open, the sheet stops under the search bar (figcraft "lista aberta": 150 px). */
const SHEET_OPEN_TOP = '150px';

// C-22: the phone's map has no zoom buttons (pinch zooms); the desktop keeps them.
const MAP_CLASS = 'max-lg:[&_.leaflet-control-zoom]:hidden!';

const FLOATING_BUTTON =
  'touch-target inline-flex items-center justify-center rounded-full bg-surface text-fg shadow-card';

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
  /** Only called after a tap on "Tentar de novo" or "Centralizar em mim" (LOC-03). */
  geolocation?: Geo;
  search?: SearchNgos;
  /** "Cidade ou CEP" of the location feature, handed in by `app/`. */
  PlaceSearch: PlaceSearch;
}

/** The map of NGOs with its list, filters and preview (MAP, MAPF). */
export function NgoMap({ hash, ...props }: NgoMapProps) {
  const parsed = parseMapHash(hash);
  if (!parsed) return <LocationError {...props} />;

  return (
    <NgoMapView center={parsed.center} radiusKm={parsed.radiusKm} {...props} />
  );
}

/** Asks for the position after a tap, then writes it in the fragment (SEC-01). */
function useLocate(
  geolocation: Geo | undefined,
  onPosition: (position: LatLng) => void,
) {
  return () =>
    geolocation?.getCurrentPosition(
      ({ coords }) =>
        onPosition({ lat: coords.latitude, lng: coords.longitude }),
      // Still no position: the screen stays as it is.
      () => {},
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
}

/**
 * MAP-15: no usable center. Figcraft 03-mapa-erro-*: the map stays behind the
 * error, in the bottom panel on the phone or in the list column on desktop.
 */
function LocationError({
  tileUrl,
  attribution,
  geolocation,
  onHashChange,
  PlaceSearch,
}: Omit<NgoMapProps, 'hash'>) {
  const isDesktop = useIsDesktop();
  const goTo = (place: LatLng) =>
    onHashChange(buildMapHash(place, DEFAULT_RADIUS_KM));
  const retry = useLocate(geolocation, goTo);

  const panel = (
    <LocationErrorPanel
      onRetry={retry}
      search={
        <PlaceSearch
          label={t.locationError.field}
          submitLabel={t.locationError.manual}
          submitVariant="outline"
          onPlace={goTo}
        />
      }
    />
  );

  return (
    <div data-slot="ngo-map" className="flex min-h-0 flex-1">
      {isDesktop && (
        <aside
          aria-label={t.list.label}
          className="flex w-[440px] shrink-0 flex-col gap-6 overflow-y-auto bg-page px-6 py-6"
        >
          {panel}
        </aside>
      )}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Scenery only: out of the tab order and the accessibility tree. */}
        <div inert className="size-full opacity-60">
          <MapView
            tileUrl={tileUrl}
            attribution={attribution}
            bounds={BRAZIL_BOUNDS}
            label={t.mapLabel}
            clusterLabel={t.clusterLabel}
            className={MAP_CLASS}
          />
        </div>
        {!isDesktop && (
          <section
            aria-label={t.locationError.title}
            className="absolute inset-x-0 bottom-0 z-[1000] max-h-full overflow-y-auto rounded-t-sheet bg-page px-gutter pt-3 pb-6 shadow-card"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-line"
            />
            {panel}
          </section>
        )}
      </div>
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
  geolocation,
  search = fetchNgos,
  PlaceSearch,
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

  // M-03: "Centralizar em mim" keeps the radius; the position only goes to the fragment.
  const locate = useLocate(geolocation, (position) =>
    onHashChange(buildMapHash(position, radiusKm)),
  );
  const goTo = (place: LatLng) => onHashChange(buildMapHash(place, radiusKm));

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
    photoUrl: ngo.id === selectedId ? ngo.thumbUrl : null,
  }));

  const filtered = openNow || species.length > 0;
  // Figcraft 03-mapa-*: the filters sit under the title, on the phone only with the sheet open.
  const filters = (isDesktop || sheetOpen) && (
    <MapFilters
      value={{ openNow, radiusKm, species }}
      onChange={handleFilters}
    />
  );
  const list = (
    <NgoList
      status={result.status}
      items={ranked}
      radiusKm={radiusKm}
      filtered={filtered}
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
      filters={filters}
    />
  );
  // "ready" with every NGO filtered out looks empty too.
  const empty =
    result.status === 'empty' ||
    (result.status === 'ready' && ranked.length === 0);
  const peek = empty ? PEEK.empty : PEEK[result.status];

  const locateButton = (
    <button
      type="button"
      aria-label={t.locate}
      onClick={locate}
      className={`${FLOATING_BUTTON} size-11`}
    >
      <LocateFixed aria-hidden="true" className="size-6" />
    </button>
  );

  return (
    <div data-slot="ngo-map" className="flex min-h-0 flex-1">
      {isDesktop && (
        <aside
          aria-label={t.list.label}
          className="flex w-[440px] shrink-0 flex-col gap-6 overflow-y-auto bg-page px-6 py-6"
        >
          <PlaceSearch label={t.search.label} onPlace={goTo} />
          {list}
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
          className={MAP_CLASS}
          anchored={
            selected && {
              position: [selected.lat, selected.lng],
              // On the phone, the card stays under the search bar and "Centralizar em mim".
              topClearance: isDesktop ? undefined : PHONE_CONTROLS_PX,
              content: (
                <div className="relative">
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
              ),
            }
          }
          circle={
            empty
              ? {
                  center: [searchCenter.lat, searchCenter.lng],
                  radiusM: radiusKm * 1000,
                }
              : undefined
          }
        />
        {isDesktop ? (
          <div className="absolute top-4 right-4 z-[1000]">{locateButton}</div>
        ) : (
          <>
            <div
              data-slot="map-search-bar"
              className="absolute inset-x-4 top-4 z-[1001]"
            >
              <PlaceSearch
                label={t.search.label}
                variant="bar"
                onPlace={goTo}
                trailing={
                  <span className="flex shrink-0 items-center gap-1">
                    <span aria-hidden="true" className="h-7 w-px bg-line" />
                    <button
                      type="button"
                      aria-label={t.search.filters}
                      aria-expanded={sheetOpen}
                      onClick={() => setSheetOpen(true)}
                      className="touch-target inline-flex items-center justify-center rounded-full text-fg"
                    >
                      <SlidersHorizontal
                        aria-hidden="true"
                        className="size-6"
                      />
                    </button>
                  </span>
                }
              />
            </div>
            <div className="absolute top-21 right-4 z-[1000]">
              {locateButton}
            </div>
          </>
        )}
        {result.status === 'loading' && (
          // M-08: the list already announces the search (MAP-12); this is the visual cue.
          <div
            data-slot="map-searching"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-1/2 z-[1000] flex -translate-y-1/2 justify-center"
          >
            <p className="flex items-center gap-3 rounded-full bg-surface px-6 py-3.5 font-bold text-fg shadow-card">
              <span className="size-6 shrink-0 animate-spin rounded-full border-4 border-surface-2 border-t-brand motion-reduce:animate-none" />
              {t.mapLoading}
            </p>
          </div>
        )}
        {!isDesktop && (
          <BottomSheet
            label={t.list.label}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            collapsedHeight={peek}
            openTop={SHEET_OPEN_TOP}
          >
            {list}
          </BottomSheet>
        )}
      </div>
    </div>
  );
}
