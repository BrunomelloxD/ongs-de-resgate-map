import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';
import { AboutDemoContainer, demoDictionary } from '@/features/demo';

export const metadata: Metadata = {
  title: demoDictionary.about.metaTitle,
};

export default function AboutDemoPage() {
  return (
    <>
      <Navbar logoutAction={logout} />
      <Suspense fallback={null}>
        <AboutDemoContainer />
      </Suspense>
    </>
  );
}
