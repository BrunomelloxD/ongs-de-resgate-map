import { List, LogOut, Map as MapIcon, Store } from 'lucide-react';
import { GuardedLink } from '@/components/ui/unsaved-changes.client';
import { cn } from '@/lib/utils';
import { dashboardDictionary } from '../dashboard.dictionary';
import { DASHBOARD_PATH, PROFILE_PATH, publicNgoPath } from '../paths';

const t = dashboardDictionary.header;

const ITEM =
  'touch-target flex min-h-12 w-full items-center gap-3 rounded-full px-4 py-3 font-bold text-on-brand-deep hover:bg-on-brand-deep/10';
const CURRENT = 'bg-brand text-on-brand hover:bg-brand';

export interface DashboardNavProps {
  /** The current path (from `usePathname()` in the app): marks the current item. */
  currentPath: string;
  slug: string;
  /** Server Action `logout` (AUTH-05). */
  logoutAction: () => Promise<void>;
  className?: string;
}

function isCurrent(href: string, currentPath: string) {
  if (href === DASHBOARD_PATH) {
    return (
      currentPath === DASHBOARD_PATH ||
      currentPath.startsWith('/painel/animais')
    );
  }
  return currentPath === href;
}

/**
 * Figcraft "itens" and "sair" of the NGO area menu: the current page is a
 * yellow pill. The links ask before leaving a form with changes (DIRTY-01);
 * "Sair" is a plain form, so it works before hydration.
 */
export function DashboardNav({
  currentPath,
  slug,
  logoutAction,
  className,
}: DashboardNavProps) {
  const items = [
    { href: DASHBOARD_PATH, label: t.animals, icon: List },
    { href: PROFILE_PATH, label: t.profile, icon: Store },
    { href: publicNgoPath(slug), label: t.publicPage, icon: MapIcon },
  ];

  return (
    <nav aria-label={t.nav} className={cn('flex flex-col gap-6', className)}>
      <ul className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(href, currentPath);
          return (
            <li key={href}>
              <GuardedLink
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(ITEM, current && CURRENT)}
              >
                <Icon aria-hidden="true" className="size-6 shrink-0" />
                {label}
              </GuardedLink>
            </li>
          );
        })}
      </ul>
      <form action={logoutAction}>
        <button type="submit" className={ITEM}>
          <LogOut aria-hidden="true" className="size-6 shrink-0" />
          {t.logout}
        </button>
      </form>
    </nav>
  );
}
