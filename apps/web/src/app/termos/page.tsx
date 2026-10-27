import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';
import {
  LegalDocument,
  legalDictionary,
  TERMS_VERSION,
} from '@/features/legal';

export const metadata: Metadata = { title: legalDictionary.terms.title };

export default function TermsPage() {
  return (
    <>
      <Navbar logoutAction={logout} />
      <LegalDocument text={legalDictionary.terms} version={TERMS_VERSION} />
    </>
  );
}
