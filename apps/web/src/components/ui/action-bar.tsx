import { cn } from '@/lib/utils';

export interface ActionBarProps {
  /** The buttons: "Voltar"/"Cancelar" first, the primary last. */
  children: React.ReactNode;
  /** Supporting text under the buttons, e.g. what "Quero adotar" opens. */
  hint?: React.ReactNode;
  /**
   * `split` (forms): on desktop each button takes its text's width, the first
   * on the left and the primary on the right. `stretch`: full width everywhere.
   */
  layout?: 'split' | 'stretch';
  className?: string;
}

/**
 * Figcraft "rodapé de ações" / "barra de ação": on the phone a white bar with a
 * shadow fixed at the bottom (above the iOS home indicator, PERF-07), with
 * 52px buttons; globals.css pads the body so the end of the page stays above
 * it. From 1024px the
 * actions go back into the page flow.
 */
export function ActionBar({
  children,
  hint,
  layout = 'split',
  className,
}: ActionBarProps) {
  return (
    <div
      data-slot="action-bar"
      data-hint={hint ? '' : undefined}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 bg-surface px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgb(23_36_30/0.12)]',
        'lg:static lg:z-auto lg:bg-transparent lg:px-0 lg:pt-4 lg:pb-0 lg:shadow-none',
        className,
      )}
    >
      <div
        className={cn(
          'flex gap-3 *:min-w-0 *:flex-1',
          layout === 'split' && 'lg:*:flex-none lg:*:last:ml-auto',
        )}
      >
        {children}
      </div>
      {hint && <p className="text-sm text-fg-secondary">{hint}</p>}
    </div>
  );
}
