import { unstable_rethrow } from 'next/navigation';
import { logout } from '@/features/auth';
import { getMyNgo } from '@/features/dashboard';
import { PainelShell } from './painel-shell.client';

// Blocking, like its pages: the session is read before anything streams, so a
// 401 redirects for real (AUTH-07) and a missing animal still answers 404.
export const instant = false;

/** T184: the NGO area shell (sidebar on desktop, header and ≡ menu on the phone). */
export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ngo: Awaited<ReturnType<typeof getMyNgo>> | null = null;
  try {
    ngo = await getMyNgo();
  } catch (error) {
    // The 401 redirect (and Next's own signals) go on; any other failure is
    // shown by the page's error.tsx, which runs the same (cached) request.
    unstable_rethrow(error);
  }
  if (!ngo) return children;

  return (
    <PainelShell
      ngo={{
        legalName: ngo.legalName,
        email: ngo.email,
        imageUrl: ngo.imageUrl,
        slug: ngo.slug,
      }}
      logoutAction={logout}
    >
      {children}
    </PainelShell>
  );
}
