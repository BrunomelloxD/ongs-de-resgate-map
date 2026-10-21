import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AboutDemoContainer, demoDictionary } from '@/features/demo';

export const metadata: Metadata = {
  title: demoDictionary.about.metaTitle,
};

export default function AboutDemoPage() {
  return (
    <Suspense fallback={null}>
      <AboutDemoContainer />
    </Suspense>
  );
}
