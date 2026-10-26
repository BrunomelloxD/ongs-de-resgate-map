'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { PASSWORD_INPUT_TEXT } from './ui.dictionary';

export type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>;

/** Design System "Input/Password": the eye button shows and hides the password. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span data-slot="password-input" className="relative flex w-full">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(
          'pr-14 aria-invalid:pr-24 aria-invalid:bg-[position:right_3.5rem_center]',
          className,
        )}
      />
      <button
        type="button"
        aria-label={PASSWORD_INPUT_TEXT.show}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:text-fg"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-6" />
        ) : (
          <Eye aria-hidden="true" className="size-6" />
        )}
      </button>
    </span>
  );
}
