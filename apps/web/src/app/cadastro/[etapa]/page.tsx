import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AuthShell } from '@/components/ui/auth-shell';
import { Stepper } from '@/components/ui/stepper';
import { GuardedLink } from '@/components/ui/unsaved-changes.client';
import { SIGNUP_STEPS, signupDictionary } from '@/features/signup';
import { SignupStepContent } from './signup-step-content';

const t = signupDictionary.page;

export const metadata: Metadata = { title: t.metaTitle };

const LOGIN_PATH = '/entrar';
// Figcraft photo of the five steps, as a WebP in public/ (PERF-02).
const SIGNUP_PHOTO = {
  src: '/photos/signup-cat.webp',
  width: 400,
  height: 520,
};

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
  // DIRTY-01: only leaving the wizard asks; the steps keep the draft.
  const BackLink = index === 0 ? GuardedLink : Link;

  return (
    <AuthShell
      variant="signup"
      photo={SIGNUP_PHOTO}
      title={t.panelTitle}
      text={t.panelText}
      footer={
        <p className="flex flex-wrap items-center gap-x-1.5">
          {t.hasAccount}
          <GuardedLink
            href={LOGIN_PATH}
            className="touch-target inline-flex items-center font-bold text-white underline"
          >
            {t.login}
          </GuardedLink>
        </p>
      }
    >
      {/* On desktop the panel carries the logo: no back arrow nor title here. */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 lg:hidden">
          <BackLink
            href={backHref}
            aria-label={t.back}
            className="touch-target inline-flex items-center justify-center rounded-full"
          >
            <ArrowLeft aria-hidden="true" className="size-6" />
          </BackLink>
          <p className="font-heading text-xl font-bold">{t.title}</p>
        </div>
        <Stepper step={index + 1} label={current.label} />
      </header>
      <Suspense fallback={null}>
        <SignupStepContent slug={current.slug} />
      </Suspense>
    </AuthShell>
  );
}
