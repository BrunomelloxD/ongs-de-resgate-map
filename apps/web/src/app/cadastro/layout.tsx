import { SignupProvider } from '@/features/signup/client';

// The provider sits above the steps, so moving between them keeps the data (SIGN-02).
export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SignupProvider>{children}</SignupProvider>;
}
