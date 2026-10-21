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
