import type { Schemas } from '@repo/api-client';

/** One NGO of the map search (MAP-18). */
export type NgoPin = Schemas['NgoPinDto'];
export type TodayHours = Schemas['TodayHoursDto'];
export type NgoSearchResponse = Schemas['NgoSearchResponseDto'];

/** An NGO with the distance computed in the browser (MAP-19). */
export type RankedNgo = NgoPin & { distanceKm: number };

/** MAPF-03: the map filters only dogs and cats. */
export type MapSpecies = 'DOG' | 'CAT';

/** RN-09: the only radii the map offers. */
export type RadiusKm = 5 | 10 | 25;

/** `mapStart` of GET /demo: where the locked demo opens the map (DEP-22). */
export interface MapStart {
  lat: number;
  lng: number;
  radiusKm: RadiusKm;
}

/**
 * The "Cidade ou CEP" search of the location feature, handed in by `app/`
 * (a feature doesn't import another). It reports a place, never to the server (SEC-01).
 */
export interface PlaceSearchProps {
  label: string;
  /** `bar`: the floating pill of the phone; `field`: a labelled field. */
  variant?: 'field' | 'bar';
  submitLabel?: string;
  submitVariant?: 'default' | 'outline';
  /** Inside the bar, after the text. */
  trailing?: React.ReactNode;
  onPlace: (place: { lat: number; lng: number }) => void;
}

export type PlaceSearch = React.ComponentType<PlaceSearchProps>;
