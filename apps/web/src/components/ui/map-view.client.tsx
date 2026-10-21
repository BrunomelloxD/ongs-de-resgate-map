'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';
import { MarkerClusterGroup } from './map-cluster';
import { Pin, PIN_SIZES, type PinVariant } from './pin';

export type LatLngTuple = [lat: number, lng: number];
/** South-west and north-east corners. */
export type LatLngBounds = [LatLngTuple, LatLngTuple];

/** MAP-04: pins closer than 40 px join a cluster. */
export const MAX_CLUSTER_RADIUS = 40;
export const MAX_ZOOM = 19;

export interface MapViewMarker {
  id: string;
  position: LatLngTuple;
  variant: Exclude<PinVariant, 'visitor'>;
  /** Accessible name of the pin, e.g. "Patas do Bairro, aberta agora". */
  label: string;
}

export interface MapViewProps {
  /** `TILE_URL`, read on the server and passed down (tiles are configurable). */
  tileUrl: string;
  /** `TILE_ATTRIBUTION`, always visible (MAP-01). */
  attribution: string;
  /** The map fits these bounds, and again whenever they change. */
  bounds: LatLngBounds;
  /** Names the map for assistive tech. */
  label: string;
  /** Accessible name of a cluster, e.g. `(n) => \`${n} ONGs nesta área\``. */
  clusterLabel: (count: number) => string;
  markers?: readonly MapViewMarker[];
  visitor?: LatLngTuple;
  /** Tap, click or Enter on a pin (A11Y-08). */
  onSelect?: (id: string) => void;
  /** The visible area after the visitor (or a fit) moves the map; a `focus` pan doesn't count (MAP-17). */
  onMoveEnd?: (bounds: LatLngBounds) => void;
  /** Pans to `position` whenever a new object arrives (MAP-10). */
  focus?: { position: LatLngTuple };
  /** Extra react-leaflet layers, e.g. a draggable marker. */
  children?: React.ReactNode;
  className?: string;
}

export function pinIcon(variant: PinVariant, label?: string): L.DivIcon {
  const [width, height] = PIN_SIZES[variant];

  return L.divIcon({
    html: renderToStaticMarkup(<Pin variant={variant} label={label} />),
    className: '',
    iconSize: [width, height],
    // The drop's tip (or the circle's centre) sits on the coordinate.
    iconAnchor: [width / 2, variant === 'visitor' ? height / 2 : height],
  });
}

export function clusterIcon(count: number, label: string): L.DivIcon {
  return L.divIcon({
    html: renderToStaticMarkup(
      <span
        role="img"
        aria-label={label}
        className="flex size-11 items-center justify-center rounded-full border-2 border-surface bg-brand-deep font-bold text-on-brand-deep shadow-md"
      >
        <span aria-hidden="true">{count}</span>
      </span>,
    ),
    className: '',
    iconSize: [44, 44],
  });
}

// leaflet.css is unlayered, so it beats Tailwind's layer: these need `!`.
// Theme colors keep the attribution readable, and the underline marks its links (A11Y-01).
const ATTRIBUTION_STYLE = cn(
  '[&_.leaflet-control-attribution]:bg-surface! [&_.leaflet-control-attribution]:text-fg-secondary!',
  '[&_.leaflet-control-attribution_a]:text-brand-text! [&_.leaflet-control-attribution_a]:underline!',
);

function isEnter(event: L.LeafletEvent): boolean {
  return (event as L.LeafletKeyboardEvent).originalEvent.key === 'Enter';
}

// markercluster fires cluster events as "cluster" + type; the typings don't list them.
const CLUSTER_HANDLERS = {
  // Enter on a focused cluster zooms in, like a click does.
  clusterkeydown: (event: L.LeafletEvent) => {
    if (isEnter(event)) {
      (event as unknown as { layer: L.MarkerCluster }).layer.zoomToBounds();
    }
  },
} as L.LeafletEventHandlerFnMap;

function MapBehaviour({
  bounds,
  label,
  animate,
}: {
  bounds: LatLngBounds;
  label: string;
  animate: boolean;
}) {
  const map = useMap();
  const [[south, west], [north, east]] = bounds;

  useEffect(() => {
    map.getContainer().setAttribute('role', 'region');
    map.getContainer().setAttribute('aria-label', label);
  }, [map, label]);

  useEffect(() => {
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { animate },
    );
  }, [map, south, west, north, east, animate]);

  return null;
}

function MoveEndReporter({
  onMoveEnd,
  skipNext,
}: {
  onMoveEnd: (bounds: LatLngBounds) => void;
  skipNext: RefObject<number>;
}) {
  const map = useMap();

  useEffect(() => {
    const report = () => {
      if (skipNext.current > 0) {
        skipNext.current -= 1;
        return;
      }
      const visible = map.getBounds();
      onMoveEnd([
        [visible.getSouth(), visible.getWest()],
        [visible.getNorth(), visible.getEast()],
      ]);
    };
    map.on('moveend', report);
    return () => {
      map.off('moveend', report);
    };
  }, [map, onMoveEnd, skipNext]);

  return null;
}

function FocusPanner({
  focus,
  animate,
  skipNext,
}: {
  focus: { position: LatLngTuple };
  animate: boolean;
  skipNext: RefObject<number>;
}) {
  const map = useMap();

  useEffect(() => {
    // Leaflet fires exactly one moveend per panTo, even when it doesn't move
    // or a newer pan interrupts it. A count survives Strict Mode's double run.
    skipNext.current += 1;
    map.panTo(focus.position, { animate });
  }, [map, focus, animate, skipNext]);

  return null;
}

/** Generic Leaflet map: tiles, attribution, clustered pins (MAP-01, MAP-03, MAP-04). */
export function MapView({
  tileUrl,
  attribution,
  bounds,
  label,
  clusterLabel,
  markers = [],
  visitor,
  onSelect,
  onMoveEnd,
  focus,
  children,
  className,
}: MapViewProps) {
  // A11Y-09: no zoom, fade or cluster animation.
  const animate = !usePrefersReducedMotion();
  const visitorIcon = useMemo(() => pinIcon('visitor'), []);
  const skipMoveEnd = useRef(0);
  // Next keeps a visited page in a hidden <Activity>. Leaflet can't survive its effects
  // re-running on the same container, so the map unmounts when hidden and mounts again.
  const [visible, setVisible] = useState(false);
  useLayoutEffect(() => {
    setVisible(true);
    return () => setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <MapContainer
      bounds={bounds}
      maxZoom={MAX_ZOOM}
      zoomAnimation={animate}
      fadeAnimation={animate}
      markerZoomAnimation={animate}
      inertia={animate}
      className={cn(ATTRIBUTION_STYLE, 'size-full', className)}
    >
      <TileLayer url={tileUrl} attribution={attribution} maxZoom={MAX_ZOOM} />
      <MapBehaviour bounds={bounds} label={label} animate={animate} />
      {onMoveEnd && (
        <MoveEndReporter onMoveEnd={onMoveEnd} skipNext={skipMoveEnd} />
      )}
      {focus && (
        <FocusPanner focus={focus} animate={animate} skipNext={skipMoveEnd} />
      )}
      <MarkerClusterGroup
        maxClusterRadius={MAX_CLUSTER_RADIUS}
        animate={animate}
        animateAddingMarkers={false}
        showCoverageOnHover={false}
        iconCreateFunction={(cluster: L.MarkerCluster) =>
          clusterIcon(
            cluster.getChildCount(),
            clusterLabel(cluster.getChildCount()),
          )
        }
        eventHandlers={CLUSTER_HANDLERS}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={pinIcon(marker.variant, marker.label)}
            zIndexOffset={marker.variant === 'selected' ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect?.(marker.id),
              // Leaflet gives the pin role="button" and tabindex, but not Enter.
              keydown: (event) => {
                if (isEnter(event)) onSelect?.(marker.id);
              },
            }}
          />
        ))}
      </MarkerClusterGroup>
      {visitor && (
        <Marker
          position={visitor}
          icon={visitorIcon}
          keyboard={false}
          interactive={false}
        />
      )}
      {children}
    </MapContainer>
  );
}
