import { Circle, CircleCheck } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/password-rules';
import { cn } from '@/lib/utils';

export interface PasswordRulesProps {
  /** The typed password; each rule is checked against it (SIGN-15). */
  password: string;
  /** Point the password field's `aria-describedby` at this id. */
  id?: string;
  title?: string;
  /** Screen reader text for each state: the icon and colour alone don't tell it. */
  metLabel?: string;
  unmetLabel?: string;
  className?: string;
}

/** SIGN-15: each password rule, marked as met or not while typing. */
export function PasswordRules({
  password,
  id,
  title = 'A senha precisa ter:',
  metLabel = 'atendida',
  unmetLabel = 'não atendida',
  className,
}: PasswordRulesProps) {
  return (
    <div id={id} className={cn('flex flex-col gap-1 text-sm', className)}>
      <p className="font-semibold">{title}</p>
      <ul className="flex flex-col gap-1">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          const Icon = met ? CircleCheck : Circle;
          return (
            <li
              key={rule.id}
              data-met={met}
              className={cn(
                'flex items-center gap-1.5',
                met ? 'font-semibold text-available-fg' : 'text-fg-secondary',
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {rule.label}
              <span className="sr-only">({met ? metLabel : unmetLabel})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
