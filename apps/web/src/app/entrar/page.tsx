import type { Metadata } from 'next';
import { Suspense } from 'react';
import { authDictionary, LoginContainer } from '@/features/auth';
import { AuthShell } from '@/components/ui/auth-shell';

// Figcraft photo of this screen, as a WebP in public/ (PERF-02).
const LOGIN_PHOTO = {
  src: '/photos/login-puppy.webp',
  width: 600,
  height: 780,
};

export const metadata: Metadata = {
  title: authDictionary.login.metaTitle,
};

// The container reads the query string, so it streams inside Suspense.
export default function LoginRoute({ searchParams }: PageProps<'/entrar'>) {
  return (
    <AuthShell
      variant="login"
      photo={LOGIN_PHOTO}
      phrase={authDictionary.panelPhrase}
    >
      <Suspense fallback={null}>
        <LoginContainer searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
