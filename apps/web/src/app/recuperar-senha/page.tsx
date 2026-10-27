import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  authDictionary,
  ForgotPasswordForm,
  requestPasswordReset,
} from '@/features/auth';
import { AuthShell } from '@/components/ui/auth-shell';
import { DemoLockContainer } from '@/features/demo';

// Figcraft photo of this screen, as a WebP in public/ (PERF-02).
const RECOVER_PHOTO = {
  src: '/photos/recover-cat.webp',
  width: 600,
  height: 780,
};

export const metadata: Metadata = {
  title: authDictionary.forgot.metaTitle,
};

// Static shell; the form streams in: the locked demo disables it (DEP-19).
export default function ForgotPasswordRoute() {
  return (
    <AuthShell
      variant="login"
      photo={RECOVER_PHOTO}
      phrase={authDictionary.panelPhrase}
    >
      <Suspense fallback={null}>
        <DemoLockContainer>
          <ForgotPasswordForm action={requestPasswordReset} />
        </DemoLockContainer>
      </Suspense>
    </AuthShell>
  );
}
