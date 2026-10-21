'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

export const DialogClose = DialogPrimitive.Close;

export interface DialogProps {
  /** Element that opens the dialog; focus returns to it on close. Omit when controlled. */
  trigger?: React.ReactElement<Record<string, unknown>>;
  title: string;
  description: string;
  /** Actions, usually `DialogClose` buttons. */
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: DialogPrimitive.Root.Props['onOpenChange'];
  className?: string;
}

/** Modal on Base UI: traps focus, Esc closes, focus goes back to the trigger. */
export function Dialog({
  trigger,
  title,
  description,
  children,
  className,
  ...rootProps
}: DialogProps) {
  return (
    <DialogPrimitive.Root {...rootProps}>
      {trigger && <DialogPrimitive.Trigger render={trigger} />}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 bg-fg/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
        <DialogPrimitive.Popup
          className={cn(
            'fixed top-1/2 left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl bg-surface p-6 text-fg shadow-card',
            className,
          )}
        >
          <DialogPrimitive.Title className="font-heading text-2xl font-extrabold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-base text-fg-secondary">
            {description}
          </DialogPrimitive.Description>
          <div className="flex flex-wrap justify-end gap-3">{children}</div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
