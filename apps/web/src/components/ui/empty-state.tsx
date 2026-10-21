import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  /** Decorative art; hidden from assistive tech. */
  illustration?: React.ReactNode;
  /** Up to two actions, e.g. `<Button>`s or links styled with `buttonVariants`. */
  actions?:
    readonly [React.ReactNode] | readonly [React.ReactNode, React.ReactNode];
  className?: string;
}

export function EmptyState({
  title,
  description,
  illustration,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center gap-3 rounded-3xl bg-subtle px-6 py-10 text-center',
        className,
      )}
    >
      {illustration && (
        <div
          data-slot="empty-state-illustration"
          aria-hidden="true"
          className="text-brand-text"
        >
          {illustration}
        </div>
      )}
      <h2 className="font-heading text-2xl font-extrabold text-fg">{title}</h2>
      <p className="max-w-md text-base text-fg-secondary">{description}</p>
      {actions && (
        <div
          data-slot="empty-state-actions"
          className="mt-2 flex flex-wrap justify-center gap-3"
        >
          {actions}
        </div>
      )}
    </div>
  );
}
