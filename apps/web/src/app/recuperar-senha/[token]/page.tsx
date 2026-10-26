import type { Metadata } from 'next';
import { Suspense } from 'react';
import { authDictionary, ResetPasswordContainer } from '@/features/auth';
import { AuthShell } from '@/components/ui/auth-shell';

// Figcraft photo of this screen, as a WebP in public/ (PERF-02).
const RECOVER_PHOTO = {
  src: '/photos/recover-cat.webp',
  width: 600,
  height: 780,
};

export const metadata: Metadata = {
  title: authDictionary.reset.metaTitle,
};

// The token comes from the URL, so the container streams inside Suspense.
export default function ResetPasswordRoute({
  params,
}: PageProps<'/recuperar-senha/[token]'>) {
  return (
    <AuthShell
      variant="login"
      photo={RECOVER_PHOTO}
      phrase={authDictionary.panelPhrase}
    >
      <Suspense fallback={null}>
        <ResetPasswordContainer params={params} />
      </Suspense>
    </AuthShell>
  );
}
