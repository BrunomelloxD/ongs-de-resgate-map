'use client';

import { CityAutocomplete, lookupCep } from '@/features/location/client';
import type { PlaceSearchProps } from '@/features/map';

/**
 * The location feature's "Cidade ou CEP" for the map (M-01, M-02, M-15). A
 * feature doesn't import another, so `app/` joins them. The chosen place only
 * goes to the URL fragment (SEC-01).
 */
export function MapPlaceSearch({ onPlace, ...props }: PlaceSearchProps) {
  return (
    <CityAutocomplete
      {...props}
      lookupCep={lookupCep}
      onSelect={onPlace}
      onCep={onPlace}
    />
  );
}
