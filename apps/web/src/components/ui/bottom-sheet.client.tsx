'use client';

import { useId, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

// SPEC_DEVIATION: MAP-08 doesn't set how far a drag must go.
// Reason: 40 px tells a drag from a tap without needing a long swipe.
export const DRAG_THRESHOLD_PX = 40;

export interface BottomSheetProps {
  /** Names the handle button, e.g. "Lista de ONGs"; `aria-expanded` tells the state. */
  label: string;
  /** Always visible, even collapsed (e.g. the result count). */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Controlled state; leave it out to let the sheet keep its own. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** How much shows when collapsed, handle included (any CSS length). */
  collapsedHeight?: string;
  /** Open, the sheet reaches this far from the top of its container (e.g. under a search bar). */
  openTop?: string;
  className?: string;
}

/** MAP-08: collapsed or open, toggled by tapping or dragging the handle. */
export function BottomSheet({
  label,
  header,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  collapsedHeight = '9rem',
  openTop,
  className,
}: BottomSheetProps) {
  const contentId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const reducedMotion = usePrefersReducedMotion();
  const dragStartY = useRef<number | null>(null);
  const dragged = useRef(false);

  function setOpen(next: boolean) {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function handlePointerUp(event: React.PointerEvent) {
    const delta = event.clientY - (dragStartY.current ?? event.clientY);
    dragStartY.current = null;
    if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;

    // The click that follows a drag must not toggle again.
    dragged.current = true;
    setOpen(delta < 0);
  }

  function handleClick() {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setOpen(!open);
  }

  return (
    <section
      data-slot="bottom-sheet"
      data-state={open ? 'open' : 'collapsed'}
      aria-label={label}
      style={
        {
          '--sheet-peek': collapsedHeight,
          top: openTop,
        } as React.CSSProperties
      }
      className={cn(
        'absolute inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-sheet bg-page shadow-card',
        !openTop && 'max-h-[85dvh]',
        open ? 'translate-y-0' : 'translate-y-[calc(100%-var(--sheet-peek))]',
        !reducedMotion && 'transition-transform duration-300 ease-out',
        className,
      )}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={contentId}
        onPointerDown={(event) => {
          dragStartY.current = event.clientY;
        }}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className="touch-target flex w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-sheet"
      >
        <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-line" />
      </button>
      {header && <div className="shrink-0 px-gutter pb-3">{header}</div>}
      <div
        id={contentId}
        inert={!open}
        className="min-h-0 flex-1 overflow-y-auto px-gutter pb-4"
      >
        {children}
      </div>
    </section>
  );
}
