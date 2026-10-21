import { resetPassword } from '../actions/reset-password';
import { ResetPasswordForm } from '../components/reset-password-form.client';

export interface ResetPasswordContainerProps {
  params: Promise<{ token: string }>;
}

/** The link's token goes bound into the action, never into the form fields. */
export async function ResetPasswordContainer({
  params,
}: ResetPasswordContainerProps) {
  const { token } = await params;

  return <ResetPasswordForm action={resetPassword.bind(null, token)} />;
}
