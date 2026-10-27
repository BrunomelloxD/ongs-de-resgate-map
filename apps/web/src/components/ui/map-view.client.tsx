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
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  ZoomControl,
} from 'react-leaflet';
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
  /** NGO photo shown inside the selected pin. */
  photoUrl?: string | null;
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
  /**
   * A card tied to a point (e.g. the selected pin's preview), moving with the
   * map. `topClearance` keeps it below controls floating at the top (default 16 px).
   */
  anchored?: {
    position: LatLngTuple;
    content: React.ReactNode;
    topClearance?: number;
  };
  /** A dashed circle, e.g. the search radius around the visitor. */
  circle?: { center: LatLngTuple; radiusM: number };
  /** Extra react-leaflet layers, e.g. a draggable marker. */
  children?: React.ReactNode;
  /** A still picture: no drag, zoom (gestures, keys or buttons). Read once, on mount. */
  fixed?: boolean;
  className?: string;
}

// SPEC_DEVIATION: the spec doesn't name the zoom buttons; Leaflet's are in English (T177).
export const ZOOM_LABELS = { zoomIn: 'Aproximar', zoomOut: 'Afastar' } as const;

/** A11Y-02: the focusable box of a pin; the drawing keeps the design size inside it. */
export const PIN_TARGET_PX = 44;

export function pinIcon(
  variant: PinVariant,
  label?: string,
  photoUrl?: string | null,
): L.DivIcon {
  const [width, height] = PIN_SIZES[variant];
  // The visitor's dot isn't interactive, so it keeps its own size.
  const [boxWidth, boxHeight] =
    variant === 'visitor'
      ? [width, height]
      : [Math.max(width, PIN_TARGET_PX), Math.max(height, PIN_TARGET_PX)];

  return L.divIcon({
    // The drawing sits at the bottom centre of the box, so its tip is the box's.
    html: renderToStaticMarkup(
      <span className="flex size-full items-end justify-center">
        <Pin variant={variant} label={label} photoUrl={photoUrl} />
      </span>,
    ),
    className: '',
    iconSize: [boxWidth, boxHeight],
    // The drop's tip (or the circle's centre) sits on the coordinate.
    iconAnchor: [
      boxWidth / 2,
      variant === 'visitor' ? boxHeight / 2 : boxHeight,
    ],
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
// A11Y-02: Leaflet's zoom buttons are 30 px; 44 px like every other control.
const ZOOM_STYLE =
  '[&_.leaflet-bar_a]:size-11! [&_.leaflet-bar_a]:text-2xl! [&_.leaflet-bar_a]:leading-11!';

// Figcraft 03-mapa-nenhuma-ong (M-11): the radius dashed in verde-mata, faintly filled.
// The classes beat Leaflet's stroke and fill attributes and follow the theme.
// `className` only takes effect as a creation option, not through pathOptions.
const CIRCLE_CLASS = 'stroke-brand-deep fill-brand-deep';
const CIRCLE_STYLE: L.PathOptions = {
  weight: 2,
  dashArray: '6 8',
  fillOpacity: 0.08,
};

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

/** Room the card leaves above a pin: the selected drop is 62 px tall. */
export const ANCHOR_GAP_PX = 74;
/** Widest anchored card, and its margin to the map's edges. */
export const ANCHOR_MAX_WIDTH_PX = 360;
const EDGE_PX = 16;
/** Less room than this above the pin, and the card goes below it. */
export const ANCHOR_ABOVE_MIN_PX = 260;

/**
 * Figcraft 03-mapa-de-ongs (M-06): the card sits above its pin (below it near
 * the top of the map), kept inside the map's edges, and follows pans and zooms.
 */
function AnchoredCard({
  position: [lat, lng],
  topClearance,
  children,
}: {
  position: LatLngTuple;
  topClearance: number;
  children: React.ReactNode;
}) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  const [, redraw] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    setHeight(ref.current!.offsetHeight);
  }, [children]);

  useEffect(() => {
    const update = () => redraw((n) => n + 1);
    map.on('move zoom resize', update);
    return () => {
      map.off('move zoom resize', update);
    };
  }, [map]);

  useEffect(() => {
    // A tap or a wheel on the card must not reach the map below it.
    L.DomEvent.disableClickPropagation(ref.current!);
    L.DomEvent.disableScrollPropagation(ref.current!);
  }, []);

  const point = map.latLngToContainerPoint([lat, lng]);
  const size = map.getSize();
  const width = Math.min(ANCHOR_MAX_WIDTH_PX, size.x - 2 * EDGE_PX);
  const left = Math.min(
    Math.max(point.x - width / 2, EDGE_PX),
    size.x - EDGE_PX - width,
  );
  const above = point.y >= ANCHOR_ABOVE_MIN_PX;

  return (
    <div
      ref={ref}
      data-slot="map-anchored"
      data-placement={above ? 'above' : 'below'}
      style={{
        left,
        width,
        // Above, it never climbs over the controls at the top of the map.
        top: above
          ? Math.max(topClearance, point.y - ANCHOR_GAP_PX - height)
          : point.y + 12,
      }}
      className="absolute z-[1000] cursor-auto"
    >
      {children}
    </div>
  );
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
  anchored,
  circle,
  children,
  fixed = false,
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
      dragging={!fixed}
      scrollWheelZoom={!fixed}
      doubleClickZoom={!fixed}
      touchZoom={!fixed}
      boxZoom={!fixed}
      keyboard={!fixed}
      // Replaced below by one with Portuguese titles.
      zoomControl={false}
      className={cn(ATTRIBUTION_STYLE, ZOOM_STYLE, 'size-full', className)}
    >
      {!fixed && (
        <ZoomControl
          zoomInTitle={ZOOM_LABELS.zoomIn}
          zoomOutTitle={ZOOM_LABELS.zoomOut}
        />
      )}
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
            icon={pinIcon(marker.variant, marker.label, marker.photoUrl)}
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
      {circle && (
        <Circle
          center={circle.center}
          radius={circle.radiusM}
          interactive={false}
          className={CIRCLE_CLASS}
          pathOptions={CIRCLE_STYLE}
        />
      )}
      {visitor && (
        <Marker
          position={visitor}
          icon={visitorIcon}
          keyboard={false}
          interactive={false}
        />
      )}
      {anchored && (
        <AnchoredCard
          key={anchored.position.join()}
          position={anchored.position}
          topClearance={anchored.topClearance ?? EDGE_PX}
        >
          {anchored.content}
        </AnchoredCard>
      )}
      {children}
    </MapContainer>
  );
}
