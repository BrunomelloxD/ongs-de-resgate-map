import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getNgo, ngoMetadata, NgoPageContainer } from '@/features/ngo-page';

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
    // The gutter goes on the full-width main, never on the max-w column (T166).
    <main className="flex flex-1 flex-col px-gutter">
      <Suspense fallback={null}>
        <NgoPageContainer ngo={ngo} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
