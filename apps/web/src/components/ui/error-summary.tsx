import { CircleAlert } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface ErrorSummaryItem {
  /** `id` of the invalid field; the link points to it. */
  fieldId: string;
  /** Text with how to fix it, same as the one shown on the field. */
  message: string;
}

export interface ErrorSummaryProps {
  title: string;
  errors: readonly ErrorSummaryItem[];
  className?: string;
}

const SUMMARY_SELECTOR = '[data-slot="error-summary"]';
const INVALID_FIELD_SELECTOR = '[aria-invalid="true"]';

/** List of errors at the top of the form (A11Y-05). Renders nothing when empty. */
export function ErrorSummary({ title, errors, className }: ErrorSummaryProps) {
  const titleId = useId();
  if (errors.length === 0) return null;

  // Design System "Alert/Erro": soft red, no border, icon and title (A11Y-05).
  return (
    <section
      data-slot="error-summary"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn('flex gap-3 rounded-[1rem] bg-error-soft p-4', className)}
    >
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 size-6 shrink-0 text-error-fg"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          id={titleId}
          className="font-sans text-base font-bold text-error-fg"
        >
          {title}
        </h2>
        <ul className="flex flex-col gap-1 text-sm text-fg">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a href={`#${error.fieldId}`} className="underline">
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export interface FieldErrorProps {
  /** Point the field's `aria-describedby` at this id. */
  id: string;
  children: React.ReactNode;
  className?: string;
}

/** Icon + text + how to fix it, never colour alone (A11Y-05). */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      data-slot="field-error"
      className={cn(
        'flex items-start gap-1.5 text-sm text-error-fg',
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Call after a failed submit: focuses the first `aria-invalid="true"` field of
 * `root` (DOM order), or the summary when no field is marked. Returns the
 * focused element, or null when there is nothing to focus.
 */
export function focusFirstError(root: ParentNode): HTMLElement | null {
  const focused =
    root.querySelector<HTMLElement>(INVALID_FIELD_SELECTOR) ??
    root.querySelector<HTMLElement>(SUMMARY_SELECTOR);
  focused?.focus();

  return focused;
}
