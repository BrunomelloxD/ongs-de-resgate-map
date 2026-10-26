import { LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { dashboardDictionary } from '../dashboard.dictionary';
import { PROFILE_PATH } from '../paths';

const t = dashboardDictionary.header;

const ACTION_CLASS =
  'touch-target inline-flex items-center gap-2 rounded-full border border-border px-4 font-semibold text-fg outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus';

export interface DashboardHeaderProps {
  ngoName: string;
  /** Server Action `logout` (AUTH-05). */
  logoutAction: () => Promise<void>;
  className?: string;
}

/** NGO name, the link to the profile (PROF-01) and "Sair". A plain form, so logging out works before hydration. */
export function DashboardHeader({
  ngoName,
  logoutAction,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 text-fg',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-heading text-xl font-bold">{ngoName}</p>
        <p className="text-sm text-fg-secondary">{t.area}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={PROFILE_PATH} className={ACTION_CLASS}>
          <UserRound aria-hidden="true" className="size-4" />
          {t.profile}
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={ACTION_CLASS}>
            <LogOut aria-hidden="true" className="size-4" />
            {t.logout}
          </button>
        </form>
      </div>
    </header>
  );
}
