import type { Metadata } from 'next';
import { LocationPage, locationDictionary } from '@/features/location';

export const metadata: Metadata = {
  title: locationDictionary.metaTitle,
};

// Static shell; the picker is the only client part (LOC-01).
export default function LocationRoute() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 text-fg">
      <LocationPage />
    </main>
  );
}
