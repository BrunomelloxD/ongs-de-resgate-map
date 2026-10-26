'use client';

import { usePathname } from 'next/navigation';
import {
  DashboardShell,
  type DashboardShellProps,
} from '@/features/dashboard/client';

/** Gives the shell the current path, so it marks the menu item (T184). */
export function PainelShell(props: Omit<DashboardShellProps, 'currentPath'>) {
  return <DashboardShell {...props} currentPath={usePathname()} />;
}
