import type { Metadata } from 'next';
import { Suspense } from 'react';
import { authDictionary, LoginContainer } from '@/features/auth';

export const metadata: Metadata = {
  title: authDictionary.login.metaTitle,
};

// The container reads the query string, so it streams inside Suspense.
export default function LoginRoute({ searchParams }: PageProps<'/entrar'>) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 text-fg">
      <Suspense fallback={null}>
        <LoginContainer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
