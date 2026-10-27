import Link from 'next/link';
import { ngoPageDictionary } from '@/features/ngo-page';

const t = ngoPageDictionary.notFound;

/** NGO-11: 404 with a way back to the map. */
export default function NgoNotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center text-fg"
    >
      <h1 className="font-heading text-4xl font-extrabold">{t.title}</h1>
      <p className="text-fg-secondary">{t.description}</p>
      <Link
        href="/mapa"
        className="touch-target inline-flex items-center justify-center rounded-full bg-brand-deep px-6 py-3 font-semibold text-on-brand-deep"
      >
        {t.map}
      </Link>
    </main>
  );
}
