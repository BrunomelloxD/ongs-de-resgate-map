import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';
import { MapPageContainer, mapDictionary } from '@/features/map';
import { MapPlaceSearch } from './map-place-search.client';

export const metadata: Metadata = {
  title: mapDictionary.metaTitle,
};

// The center rides in the URL fragment, read only in the browser (SEC-01).
export default function MapRoute() {
  return (
    <>
      {/* The map doesn't scroll: the navbar always shows as "Rolada" (navbar note, item 10). */}
      <Navbar current="map" solid logoutAction={logout} />
      <main id="conteudo" className="flex min-h-0 flex-1 flex-col text-fg">
        <h1 className="sr-only">{mapDictionary.mapLabel}</h1>
        <Suspense fallback={null}>
          <MapPageContainer PlaceSearch={MapPlaceSearch} />
        </Suspense>
      </main>
    </>
  );
}
