import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getNgo, ngoMetadata, NgoPageContainer } from '@/features/ngo-page';
import { SiteFooter } from '@/components/ui/site-footer';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';

// Blocking route: the NGO is checked before anything streams, so a missing
// slug answers HTTP 404 (NGO-11) instead of a 200 with the 404 page inside.
export const instant = false;

// SHARE-04: rendered on the server, so link previews read the tags.
export async function generateMetadata({
  params,
}: PageProps<'/ong/[slug]'>): Promise<Metadata> {
  const ngo = await getNgo((await params).slug);
  if (!ngo) notFound();

  return ngoMetadata(ngo);
}

export default async function NgoRoute({
  params,
  searchParams,
}: PageProps<'/ong/[slug]'>) {
  // Before any Suspense boundary: a missing slug answers a real 404 (NGO-11).
  const ngo = await getNgo((await params).slug);
  if (!ngo) notFound();

  return (
    <>
      <Navbar logoutAction={logout} />
      {/* The cover spans the page; the container puts the gutter under it (T166). */}
      <main id="conteudo" className="flex flex-1 flex-col">
        <Suspense fallback={null}>
          <NgoPageContainer ngo={ngo} searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
