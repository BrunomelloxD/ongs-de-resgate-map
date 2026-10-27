import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  AnimalFormContainer,
  animalFormDictionary,
  getMyAnimal,
  photoLimit,
} from '@/features/animal-form';
import { getMyNgo, toggleAvailability } from '@/features/dashboard';
import { DemoExpiryNotice, getDemoInfo } from '@/features/demo';

export const metadata: Metadata = {
  title: animalFormDictionary.page.metaEdit,
};

// Blocking route: a missing or foreign id answers HTTP 404 (SEC-06), and a 401
// redirects for real (AUTH-07), before anything streams.
export const instant = false;

/** AFORM-13 to AFORM-16, DEMO-06. */
export default async function EditAnimalRoute({
  params,
}: PageProps<'/painel/animais/[id]'>) {
  const { id } = await params;
  const [ngo, demo, animal] = await Promise.all([
    getMyNgo(),
    getDemoInfo(),
    getMyAnimal(id),
  ]);
  if (!animal) notFound();

  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 text-fg"
    >
      <AnimalFormContainer
        animal={animal}
        maxPhotos={photoLimit(demo)}
        markUnavailable={toggleAvailability}
        notice={<DemoExpiryNotice expiresAt={ngo.expiresAt} now={new Date()} />}
      />
    </main>
  );
}
