import { cn } from '@/lib/utils';

/** Loading placeholder. Hidden from assistive tech: the loading state is announced elsewhere. */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
