import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardDictionary } from '../dashboard.dictionary';

const t = dashboardDictionary.header;

export interface DashboardHeaderProps {
  ngoName: string;
  /** Server Action `logout` (AUTH-05). */
  logoutAction: () => Promise<void>;
  className?: string;
}

/** NGO name and "Sair". A plain form, so logging out works before hydration. */
export function DashboardHeader({
  ngoName,
  logoutAction,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-4 text-fg',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-heading text-xl font-bold">{ngoName}</p>
        <p className="text-sm text-fg-secondary">{t.area}</p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="touch-target inline-flex items-center gap-2 rounded-full border border-border px-4 font-semibold text-fg outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {t.logout}
        </button>
      </form>
    </header>
  );
}
