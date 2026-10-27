import { Suspense } from 'react';
import { SiteFooter } from '@/components/ui/site-footer';
import { Navbar } from '@/components/ui/navbar.client';
import { ThemeToggle } from '@/components/ui/theme-toggle.client';
import {
  AccountDeletedContainer,
  HomeHero,
  homeDictionary,
} from '@/features/home';
import { logout } from '@/features/auth';

// Static shell: only the `?conta=excluida` notice (PROF-08) waits for the request.
export default function HomePage({ searchParams }: PageProps<'/'>) {
  return (
    <>
      <Navbar logoutAction={logout} />
      <HomeHero
        notice={
          <Suspense fallback={null}>
            <AccountDeletedContainer searchParams={searchParams} />
          </Suspense>
        }
      />
      <SiteFooter
        // The theme toggle (lote 10) left the header (H-05); white on the dark footer.
        extra={
          <span className="inline-flex text-white [&_button]:text-white [&_button:hover]:bg-white/10">
            <ThemeToggle labels={homeDictionary.theme} />
          </span>
        }
      />
    </>
  );
}
