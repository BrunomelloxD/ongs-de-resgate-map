import type { Metadata } from 'next';
import {
  LegalDocument,
  legalDictionary,
  TERMS_VERSION,
} from '@/features/legal';

export const metadata: Metadata = { title: legalDictionary.privacy.title };

export default function PrivacyPage() {
  return (
    <LegalDocument text={legalDictionary.privacy} version={TERMS_VERSION} />
  );
}
