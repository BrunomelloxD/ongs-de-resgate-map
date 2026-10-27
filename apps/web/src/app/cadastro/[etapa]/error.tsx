'use client';

import { signupDictionary } from '@/features/signup/client';

const t = signupDictionary.page;

/** The api failed (GET /demo): offer a retry. */
export default function SignupError({ retry }: { retry: () => void }) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center text-fg"
    >
      <h1 className="font-heading text-3xl font-extrabold">{t.errorTitle}</h1>
      <button
        type="button"
        onClick={() => retry()}
        className="touch-target inline-flex items-center justify-center rounded-full bg-brand-deep px-6 py-3 font-semibold text-on-brand-deep"
      >
        {t.retry}
      </button>
    </main>
  );
}
