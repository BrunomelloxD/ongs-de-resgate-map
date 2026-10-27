import Link from 'next/link';
import { animalFormDictionary } from '@/features/animal-form';

const t = animalFormDictionary;

/** SEC-06: another NGO's animal, a deleted one or a bad id; with a way back. */
export default function MyAnimalNotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center text-fg"
    >
      <h1 className="font-heading text-4xl font-extrabold">
        {t.notFound.title}
      </h1>
      <p className="text-fg-secondary">{t.notFound.description}</p>
      <Link
        href="/painel"
        className="touch-target inline-flex items-center justify-center rounded-full bg-brand-deep px-6 py-3 font-semibold text-on-brand-deep"
      >
        {t.page.back}
      </Link>
    </main>
  );
}
