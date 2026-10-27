import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/ui/site-footer';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';
import {
  AnimalDetail,
  animalMetadata,
  animalShare,
  getAnimal,
} from '@/features/animal-page';

// Blocking route: the animal is checked before anything streams, so a missing,
// deleted or foreign id answers HTTP 404 (ANI-06, AFORM-17).
export const instant = false;

async function load(params: PageProps<'/ong/[slug]/animais/[id]'>['params']) {
  const { slug, id } = await params;
  const animal = await getAnimal(slug, id);
  if (!animal) notFound();
  return animal;
}

// SHARE-04: rendered on the server, so link previews read the tags.
export async function generateMetadata({
  params,
}: PageProps<'/ong/[slug]/animais/[id]'>): Promise<Metadata> {
  return animalMetadata(await load(params));
}

export default async function AnimalRoute({
  params,
}: PageProps<'/ong/[slug]/animais/[id]'>) {
  const animal = await load(params);

  return (
    <>
      <Navbar logoutAction={logout} />
      {/* The gutter goes on the full-width main, never on the max-w column (T166). */}
      <main id="conteudo" className="flex-1 px-gutter py-8">
        <div className="mx-auto w-full max-w-6xl">
          <AnimalDetail animal={animal} share={animalShare(animal)} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
