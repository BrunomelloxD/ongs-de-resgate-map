import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { MediaService } from '@/modules/media/services/media.service.js';
import {
  IDemoAccountRepository,
  type Point,
} from '../repositories/demo-account.repository.interface.js';

/** The radii the web map accepts (map-hash.ts). */
const RADII = [5, 10, 25] as const;
export type RadiusKm = (typeof RADII)[number];

export interface MapStart extends Point {
  radiusKm: RadiusKm;
}

/** DEP-59: without the account (seed not run), the map opens in São Paulo. */
export const FALLBACK_MAP_START: MapStart = {
  lat: -23.5505,
  lng: -46.6333,
  radiusKm: 10,
};

export interface DemoResetReport {
  animals: number;
  objects: number;
  bytes: number;
}

const EARTH_RADIUS_KM = 6371;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance (haversine). */
export function distanceKm(a: Point, b: Point): number {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** The shared account of the locked demo (AD-008). */
@Injectable()
export class DemoAccountService {
  constructor(
    private readonly config: AppConfigService,
    private readonly accounts: IDemoAccountRepository,
    private readonly media: MediaService,
  ) {}

  /**
   * DEP-22: the account's NGO as the center, with the smallest radius that
   * frames every active NGO of its city (at most 25 km). null while open.
   */
  async mapStart(): Promise<MapStart | null> {
    const account = this.config.demoAccount;
    if (!account) return null;

    const ngo = await this.accounts.findByEmail(account.email);
    if (!ngo) return FALLBACK_MAP_START;

    const points = await this.accounts.findActivePoints(ngo.city, ngo.uf);
    const farthest = Math.max(0, ...points.map((p) => distanceKm(ngo, p)));
    const radiusKm = RADII.find((r) => farthest <= r) ?? 25;
    return { lat: ngo.lat, lng: ngo.lng, radiusKm };
  }

  /**
   * DEP-28: removes every animal of the account and their photos; the NGO,
   * its image and the example NGOs stay. Bucket first: if it fails, the
   * animals stay for the next run (DEP-31). null while open or without the account.
   */
  async reset(): Promise<DemoResetReport | null> {
    const account = this.config.demoAccount;
    if (!account) return null;

    const ngo = await this.accounts.findByEmail(account.email);
    if (!ngo) return null;

    const { count, bytes } = await this.media.deleteNgoImages(ngo.id);
    const animals = await this.accounts.deleteAnimals(ngo.id);
    return { animals, objects: count, bytes };
  }
}
