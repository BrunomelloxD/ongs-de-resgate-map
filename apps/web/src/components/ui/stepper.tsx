import { useId } from 'react';
import { cn } from '@/lib/utils';

export const STEPPER_TOTAL = 5;

export interface StepperProps {
  /** Current step, from 1 to 5. */
  step: number;
  /** Name of the current step, e.g. "Endereço". */
  label: string;
  className?: string;
}

export function Stepper({ step, label, className }: StepperProps) {
  const textId = useId();
  const text = `Etapa ${step} de ${STEPPER_TOTAL}`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span id={textId} className="text-sm font-bold text-fg-secondary">
          {text}
        </span>
        <span className="font-heading text-lg font-bold text-fg">{label}</span>
      </p>
      <div
        role="progressbar"
        aria-labelledby={textId}
        aria-valuemin={1}
        aria-valuemax={STEPPER_TOTAL}
        aria-valuenow={step}
        aria-valuetext={`${text}: ${label}`}
        className="flex gap-1.5"
      >
        {Array.from({ length: STEPPER_TOTAL }, (_, index) => {
          const n = index + 1;
          const state =
            n < step ? 'complete' : n === step ? 'current' : 'upcoming';

          return (
            <span
              key={n}
              data-state={state}
              className={cn(
                'h-2 flex-1 rounded-full',
                state === 'upcoming' ? 'bg-surface-2' : 'bg-brand-deep',
                state === 'current' && 'bg-brand',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
