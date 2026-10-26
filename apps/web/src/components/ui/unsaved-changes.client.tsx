'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Button } from './button';
import { Dialog, DialogClose } from './dialog.client';
import { UNSAVED_CHANGES_TEXT } from './ui.dictionary';

// One app-wide registry instead of a context: the links that leave a form live
// in other trees too (the demo banner of the root layout).
const dirtySources = new Set<symbol>();

const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
};

/**
 * DIRTY-01/02: while `dirty`, the GuardedLinks ask before leaving and closing
 * or reloading the tab triggers `beforeunload`. Effects clean up when
 * <Activity> hides the page, so a hidden form never guards the visible one.
 */
export function useUnsavedChanges(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const source = Symbol('unsaved-changes');
    dirtySources.add(source);
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => {
      dirtySources.delete(source);
      if (dirtySources.size === 0)
        window.removeEventListener('beforeunload', warnBeforeUnload);
    };
  }, [dirty]);
}

export interface UnsavedChangesProviderProps {
  /** True while the form has changes that weren't saved. */
  dirty: boolean;
  children?: React.ReactNode;
}

/** Marks its form as dirty for the GuardedLinks and `beforeunload` (DIRTY). */
export function UnsavedChangesProvider({
  dirty,
  children,
}: UnsavedChangesProviderProps) {
  useUnsavedChanges(dirty);
  return children;
}

const ACTION = 'px-6';

// SPEC_DEVIATION: the design says `<Link onNavigate>`; this uses onClick.
// Reason: Storybook's next/link mock drops onNavigate, so the guard couldn't be shown there.
/**
 * `next/link` that, with unsaved changes, opens "Sair sem salvar?" instead of
 * navigating (DIRTY-01); without them it navigates right away (DIRTY-03).
 */
export function GuardedLink(
  props: Omit<ComponentProps<typeof Link>, 'ref' | 'onClick' | 'onNavigate'>,
) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const leaving = useRef(false);

  function leave() {
    setOpen(false);
    leaving.current = true;
    // Same link, same navigation; the click handler lets this one through.
    anchorRef.current?.click();
  }

  return (
    <>
      <Link
        {...props}
        ref={anchorRef}
        onClick={(event) => {
          if (leaving.current) {
            leaving.current = false;
            return;
          }
          if (dirtySources.size === 0) return;
          // A new tab or window keeps this page and its changes.
          const newTab =
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            (props.target !== undefined && props.target !== '_self');
          if (newTab) return;
          // Next skips the navigation of a click already prevented.
          event.preventDefault();
          setOpen(true);
        }}
      />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={UNSAVED_CHANGES_TEXT.title}
        description={UNSAVED_CHANGES_TEXT.description}
      >
        <DialogClose
          render={<Button variant="outline" size="lg" className={ACTION} />}
        >
          {UNSAVED_CHANGES_TEXT.stay}
        </DialogClose>
        <Button
          variant="destructive"
          size="lg"
          onClick={leave}
          className={ACTION}
        >
          {UNSAVED_CHANGES_TEXT.leave}
        </Button>
      </Dialog>
    </>
  );
}
