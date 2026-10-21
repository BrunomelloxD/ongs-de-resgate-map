'use client';

import { useRouter } from 'next/navigation';
import { lookupCep } from './actions/lookup-cep';
import { LocationPicker } from './components/location-picker.client';

/**
 * Wires the picker to the browser and the router. Kept out of `components/`
 * because Storybook can't mount the App Router (ARCHITECTURE.md §9).
 */
export function LocationPage() {
  const router = useRouter();

  return (
    <LocationPicker
      // Read on the client only; the server render never calls it.
      geolocation={globalThis.navigator?.geolocation}
      lookupCep={lookupCep}
      navigate={(href) => router.push(href)}
    />
  );
}
