import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LocationPage, locationDictionary } from '@/features/location';
import { AppBar } from '@/components/ui/app-bar';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';
import { LockedDemoRedirect } from './locked-demo-redirect';

export const metadata: Metadata = {
  title: locationDictionary.metaTitle,
};

/** The map with pins on the right half of the desktop (figcraft 02, L-02). */
const LOCATION_MAP_ART = '/photos/location-map.webp';

// Static shell; the picker is the only client part (LOC-01).
export default function LocationRoute() {
  return (
    <>
      {/* AD-008: the locked demo skips to /mapa (DEP-21). */}
      <Suspense fallback={null}>
        <LockedDemoRedirect />
      </Suspense>
      <Navbar current="map" logoutAction={logout} />
      <main
        id="conteudo"
        className="flex flex-1 flex-col text-fg lg:grid lg:grid-cols-2"
      >
        <div className="flex flex-col gap-2 px-4 py-2 lg:gap-4 lg:py-14 lg:pr-12 lg:pl-30">
          <AppBar
            title={locationDictionary.metaTitle}
            titleAs="p"
            back={{ href: '/', label: locationDictionary.back }}
            phoneOnly
          />
          <div className="w-full max-w-[528px] pb-6">
            <LocationPage />
          </div>
        </div>
        <div
          data-slot="location-map-art"
          className="relative hidden overflow-hidden lg:block"
        >
          <img
            src={LOCATION_MAP_ART}
            alt=""
            width={1440}
            height={1640}
            className="absolute inset-0 size-full object-cover object-left-top"
          />
        </div>
      </main>
    </>
  );
}
