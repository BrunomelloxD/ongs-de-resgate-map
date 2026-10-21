import type { Metadata } from 'next';
import { Suspense } from 'react';
import { logout } from '@/features/auth';
import {
  DashboardContainer,
  DashboardHeader,
  dashboardDictionary,
  getMyNgo,
} from '@/features/dashboard';
import { DemoExpiryNotice } from '@/features/demo';

export const metadata: Metadata = {
  title: dashboardDictionary.metaTitle,
};

// Blocking route: the session is checked before anything streams, so a 401
// (expired session, or the NGO removed by the cleanup) redirects for real (AUTH-07).
export const instant = false;

export default async function DashboardRoute() {
  const ngo = await getMyNgo();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 text-fg">
      <DashboardHeader ngoName={ngo.legalName} logoutAction={logout} />
      <DemoExpiryNotice expiresAt={ngo.expiresAt} now={new Date()} />
      <Suspense fallback={null}>
        <DashboardContainer ngo={ngo} />
      </Suspense>
    </main>
  );
}
