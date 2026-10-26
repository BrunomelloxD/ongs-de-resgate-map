'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/logo';
import { dashboardDictionary } from '../dashboard.dictionary';
import { DashboardNav, type DashboardNavProps } from './dashboard-nav';
import { NgoIdentity } from './ngo-identity';

const t = dashboardDictionary.header;

export interface DashboardMenuProps extends DashboardNavProps {
  ngoName: string;
  email: string;
  imageUrl: string | null;
}

/**
 * The ≡ of the phone header: opens the same menu as the desktop sidebar in a
 * panel that traps focus and closes with Esc (Base UI Dialog). It closes on
 * its own when the page changes.
 */
export function DashboardMenu({
  ngoName,
  email,
  imageUrl,
  currentPath,
  ...navProps
}: DashboardMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [currentPath]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t.openMenu}
        className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-fg hover:bg-subtle"
      >
        <Menu aria-hidden="true" className="size-6" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-fg/40" />
        <Dialog.Popup
          aria-label={t.nav}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-6 overflow-y-auto bg-brand-deep-pressed px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-on-brand-deep"
        >
          <div className="flex items-center justify-between gap-2">
            <Logo variant="light" />
            <Dialog.Close
              aria-label={t.closeMenu}
              className="touch-target inline-flex items-center justify-center rounded-full hover:bg-on-brand-deep/10"
            >
              <X aria-hidden="true" className="size-6" />
            </Dialog.Close>
          </div>
          <NgoIdentity
            tone="sidebar"
            name={ngoName}
            detail={email}
            imageUrl={imageUrl}
          />
          <DashboardNav currentPath={currentPath} {...navProps} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
