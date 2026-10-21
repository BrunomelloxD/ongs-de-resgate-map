import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

export type SwitchProps = Omit<SwitchPrimitive.Root.Props, 'aria-label'> & {
  /** Required (A11Y-07): the switch has no visible text of its own. */
  'aria-label': string;
};

/** `role="switch"` with `aria-checked`. The 44px hit area is the root; the track is drawn inside. */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'group/switch inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-7 w-12 items-center rounded-full border border-border bg-surface-2 p-0.5 transition-colors group-data-[checked]/switch:border-available group-data-[checked]/switch:bg-available"
      >
        <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-surface shadow-sm ring-1 ring-border transition-transform group-data-[checked]/switch:translate-x-5" />
      </span>
    </SwitchPrimitive.Root>
  );
}
