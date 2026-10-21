import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MapPageContainer, mapDictionary } from '@/features/map';

export const metadata: Metadata = {
  title: mapDictionary.metaTitle,
};

// The center rides in the URL fragment, read only in the browser (SEC-01).
export default function MapRoute() {
  return (
    <main className="flex min-h-0 flex-1 flex-col text-fg">
      <h1 className="sr-only">{mapDictionary.mapLabel}</h1>
      <Suspense fallback={null}>
        <MapPageContainer />
      </Suspense>
    </main>
  );
}
