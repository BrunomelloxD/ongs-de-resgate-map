import type { Metadata } from 'next';
import { Suspense } from 'react';
import { authDictionary, ResetPasswordContainer } from '@/features/auth';

export const metadata: Metadata = {
  title: authDictionary.reset.metaTitle,
};

// The token comes from the URL, so the container streams inside Suspense.
export default function ResetPasswordRoute({
  params,
}: PageProps<'/recuperar-senha/[token]'>) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 text-fg">
      <Suspense fallback={null}>
        <ResetPasswordContainer params={params} />
      </Suspense>
    </main>
  );
}
