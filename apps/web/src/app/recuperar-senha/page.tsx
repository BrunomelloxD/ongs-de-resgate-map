import type { Metadata } from 'next';
import {
  authDictionary,
  ForgotPasswordForm,
  requestPasswordReset,
} from '@/features/auth';
import { AuthShell } from '@/components/ui/auth-shell';

// Figcraft photo of this screen, as a WebP in public/ (PERF-02).
const RECOVER_PHOTO = {
  src: '/photos/recover-cat.webp',
  width: 600,
  height: 780,
};

export const metadata: Metadata = {
  title: authDictionary.forgot.metaTitle,
};

// Static shell: nothing here depends on the request.
export default function ForgotPasswordRoute() {
  return (
    <AuthShell
      variant="login"
      photo={RECOVER_PHOTO}
      phrase={authDictionary.panelPhrase}
    >
      <ForgotPasswordForm action={requestPasswordReset} />
    </AuthShell>
  );
}
