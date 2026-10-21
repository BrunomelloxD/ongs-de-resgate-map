import type { NgoPin, RankedNgo } from './map.types';

export function makeNgoPin(overrides: Partial<NgoPin> = {}): NgoPin {
  return {
    id: '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01',
    slug: 'patas-do-bairro',
    name: 'Patas do Bairro',
    lat: -23.5869,
    lng: -46.6347,
    openNow: true,
    todayHours: { closed: false, opensAt: '09:00', closesAt: '18:00' },
    thumbUrl: '/img/ngos/6f1c2b52/logo/a1-160.webp',
    ...overrides,
  };
}

export function makeRankedNgo(overrides: Partial<RankedNgo> = {}): RankedNgo {
  return { ...makeNgoPin(), distanceKm: 1.2, ...overrides };
}

/** One-pixel PNGs: stories never fetch real photos or tiles. */
export const LOCAL_THUMB_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC';
export const LOCAL_TILE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN48+I+AAV3ArSJrfWSAAAAAElFTkSuQmCC';
