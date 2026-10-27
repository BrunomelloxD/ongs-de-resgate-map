import type { Metadata } from 'next';
import {
  AnimalFormContainer,
  animalFormDictionary,
  photoLimit,
} from '@/features/animal-form';
import { getMyNgo, toggleAvailability } from '@/features/dashboard';
import { DemoExpiryNotice, getDemoInfo } from '@/features/demo';

export const metadata: Metadata = {
  title: animalFormDictionary.page.newTitle,
};

// Blocking route: the session is checked before anything streams (AUTH-07).
export const instant = false;

/** DASH-06, AFORM-01, DEMO-06. */
export default async function NewAnimalRoute() {
  // The session read comes first: it stops the build prerender, so the cached
  // getDemoInfo() (which needs the env) only runs at request time.
  const ngo = await getMyNgo();
  const demo = await getDemoInfo();

  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 text-fg"
    >
      <AnimalFormContainer
        animal={null}
        maxPhotos={photoLimit(demo)}
        markUnavailable={toggleAvailability}
        notice={<DemoExpiryNotice expiresAt={ngo.expiresAt} now={new Date()} />}
      />
    </main>
  );
}
