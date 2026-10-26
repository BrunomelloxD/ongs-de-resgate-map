import { cn } from '@/lib/utils';
import { PinPhoto } from './pin-photo';

export interface EmptyStateProps {
  title: string;
  description: string;
  /** Icon drawn inside the pin-shaped illustration; hidden from assistive tech. */
  illustration?: React.ReactNode;
  /** `brand`: verde-mata pin with a light icon (first access); default: Superfície 2. */
  illustrationTone?: 'subtle' | 'brand';
  /**
   * `card`: centred in a Superfície card, actions at their own width (figcraft
   * 04-pagina-da-ong-sem-animais); default: left-aligned on the page.
   */
  layout?: 'page' | 'card';
  /** Up to two actions, e.g. `<Button>`s or links styled with `buttonVariants`. */
  actions?:
    readonly [React.ReactNode] | readonly [React.ReactNode, React.ReactNode];
  className?: string;
}

/**
 * Design System empty state: left-aligned on the page background, the
 * illustration cut in a pin above the title and the actions stacked.
 */
export function EmptyState({
  title,
  description,
  illustration,
  illustrationTone = 'subtle',
  layout = 'page',
  actions,
  className,
}: EmptyStateProps) {
  const brand = illustrationTone === 'brand';
  const card = layout === 'card';

  return (
    <div
      data-slot="empty-state"
      data-layout={layout}
      className={cn(
        'flex flex-col gap-3',
        card
          ? 'items-center rounded-3xl bg-subtle px-6 py-8 text-center'
          : 'items-start text-left',
        className,
      )}
    >
      {illustration && (
        <div data-slot="empty-state-illustration" aria-hidden="true">
          <PinPhoto
            width={brand ? 72 : 56}
            icon={illustration}
            className={cn(
              brand
                ? 'bg-brand-deep text-brand [&_svg]:size-8'
                : 'bg-surface-2 text-fg [&_svg]:size-6',
            )}
          />
        </div>
      )}
      <h2
        className={cn(
          'font-heading font-extrabold text-fg',
          card ? 'text-lg' : 'text-2xl',
        )}
      >
        {title}
      </h2>
      <p className="max-w-xl text-base text-fg-secondary">{description}</p>
      {actions && (
        <div
          data-slot="empty-state-actions"
          className={cn(
            'mt-2 flex flex-col gap-3',
            card ? 'items-center' : 'w-full *:w-full',
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
