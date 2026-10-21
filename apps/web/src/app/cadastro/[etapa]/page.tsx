import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Stepper } from '@/components/ui/stepper';
import { SIGNUP_STEPS, signupDictionary } from '@/features/signup';
import { SignupStepContent } from './signup-step-content';

const t = signupDictionary.page;

export const metadata: Metadata = { title: t.metaTitle };

export function generateStaticParams() {
  return SIGNUP_STEPS.map(({ slug }) => ({ etapa: slug }));
}

export default async function SignupStepRoute({
  params,
}: PageProps<'/cadastro/[etapa]'>) {
  const { etapa } = await params;
  const index = SIGNUP_STEPS.findIndex(({ slug }) => slug === etapa);
  if (index < 0) notFound();
  const current = SIGNUP_STEPS[index]!;
  const backHref =
    index === 0 ? '/' : `/cadastro/${SIGNUP_STEPS[index - 1]!.slug}`;

  // px-4 inside the narrow column: px-gutter is 120px on desktop.
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 text-fg">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            aria-label={t.back}
            className="touch-target inline-flex items-center justify-center rounded-full"
          >
            <ArrowLeft aria-hidden="true" className="size-6" />
          </Link>
          <p className="font-heading text-xl font-bold">{t.title}</p>
        </div>
        <Stepper step={index + 1} label={current.label} />
      </header>
      <Suspense fallback={null}>
        <SignupStepContent slug={current.slug} />
      </Suspense>
    </main>
  );
}
