import type { Metadata } from 'next';
import {
  LegalDocument,
  legalDictionary,
  TERMS_VERSION,
} from '@/features/legal';

export const metadata: Metadata = { title: legalDictionary.terms.title };

export default function TermsPage() {
  return <LegalDocument text={legalDictionary.terms} version={TERMS_VERSION} />;
}
