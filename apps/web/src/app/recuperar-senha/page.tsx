import type { Metadata } from 'next';
import {
  authDictionary,
  ForgotPasswordForm,
  requestPasswordReset,
} from '@/features/auth';

export const metadata: Metadata = {
  title: authDictionary.forgot.metaTitle,
};

// Static shell: nothing here depends on the request.
export default function ForgotPasswordRoute() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 text-fg">
      <ForgotPasswordForm action={requestPasswordReset} />
    </main>
  );
}
