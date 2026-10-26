import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

export type SwitchProps = Omit<SwitchPrimitive.Root.Props, 'aria-label'> & {
  /** Required (A11Y-07): the switch has no visible text of its own. */
  'aria-label': string;
};

/** Design System "Toggle": grey track off, green on. `role="switch"` with `aria-checked`. The 44px hit area is the root; the track is drawn inside. */
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
        className="inline-flex h-7 w-12 items-center rounded-full bg-switch-off p-[3px] transition-colors group-data-[checked]/switch:bg-available"
      >
        <SwitchPrimitive.Thumb className="block size-5.5 rounded-full bg-white shadow-sm transition-transform group-data-[checked]/switch:translate-x-5" />
      </span>
    </SwitchPrimitive.Root>
  );
}
