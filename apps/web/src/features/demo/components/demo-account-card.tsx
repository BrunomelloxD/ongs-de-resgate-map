import { Alert } from '@/components/ui/alert';
import { demoDictionary } from '../demo.dictionary';

export interface DemoAccountCardProps {
  email: string;
  password: string;
}

const t = demoDictionary.account;

/** DEP-18: the shared account of the locked demo, on /entrar. */
export function DemoAccountCard({ email, password }: DemoAccountCardProps) {
  return (
    <Alert variant="info" title={t.title} data-slot="demo-account-card">
      <p>{t.text}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="font-semibold">{t.email}</dt>
        <dd className="break-all">{email}</dd>
        <dt className="font-semibold">{t.password}</dt>
        <dd className="break-all">{password}</dd>
      </dl>
    </Alert>
  );
}
