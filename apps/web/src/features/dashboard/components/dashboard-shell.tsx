import { Logo } from '@/components/ui/logo';
import { dashboardDictionary } from '../dashboard.dictionary';
import { DASHBOARD_PATH } from '../paths';
import { DashboardMenu } from './dashboard-menu.client';
import { DashboardNav } from './dashboard-nav';
import { NgoIdentity } from './ngo-identity';

const t = dashboardDictionary.header;

export interface DashboardShellProps {
  ngo: {
    legalName: string;
    email: string;
    imageUrl: string | null;
    slug: string;
  };
  /** From `usePathname()` in the app (Storybook can't run next/navigation). */
  currentPath: string;
  /** Server Action `logout` (AUTH-05). */
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * Figcraft 09–11 (T184): on desktop the 300px verde-mata escuro sidebar with the
 * logo, the NGO and the menu; on the phone, the dashboard gets a header with the
 * NGO and the ≡ menu, and the inner pages bring their own app bar.
 */
export function DashboardShell({
  ngo,
  currentPath,
  logoutAction,
  children,
}: DashboardShellProps) {
  const navProps = { currentPath, slug: ngo.slug, logoutAction };

  return (
    <div
      data-slot="dashboard-shell"
      className="flex flex-1 flex-col lg:flex-row"
    >
      <aside
        data-slot="dashboard-sidebar"
        className="hidden w-[300px] shrink-0 bg-brand-deep-pressed px-5 py-7 text-on-brand-deep lg:block"
      >
        <div className="sticky top-7 flex flex-col gap-6">
          <Logo variant="light" />
          <NgoIdentity
            tone="sidebar"
            name={ngo.legalName}
            detail={ngo.email}
            imageUrl={ngo.imageUrl}
            className="py-4"
          />
          <DashboardNav {...navProps} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {currentPath === DASHBOARD_PATH && (
          <header
            data-slot="dashboard-mobile-header"
            className="flex items-center gap-3 py-2 pr-2 pl-4 lg:hidden"
          >
            <NgoIdentity
              tone="header"
              name={ngo.legalName}
              detail={t.area}
              imageUrl={ngo.imageUrl}
              className="flex-1"
            />
            <DashboardMenu
              ngoName={ngo.legalName}
              email={ngo.email}
              imageUrl={ngo.imageUrl}
              {...navProps}
            />
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
