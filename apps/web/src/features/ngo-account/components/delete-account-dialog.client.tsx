'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose } from '@/components/ui/dialog.client';
import { FieldError } from '@/components/ui/error-summary';
import { PasswordInput } from '@/components/ui/password-input.client';
import { Label } from '@/components/ui/label';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type { DeleteAccountResult } from '../ngo-account.types';

const t = ngoAccountDictionary.deleteAccount;

const PASSWORD_ID = 'delete-account-password';
const HINT_ID = `${PASSWORD_ID}-hint`;
const ERROR_ID = `${PASSWORD_ID}-error`;
const ACTION = 'w-full sm:w-auto';

export interface DeleteAccountDialogProps {
  /** The `deleteAccount` Server Action: success redirects to `/?conta=excluida`. */
  onDelete: (password: string) => Promise<DeleteAccountResult>;
}

/** PROF-07, PROF-08: says what goes away and asks the current password. */
export function DeleteAccountDialog({ onDelete }: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    setPassword('');
    setError(undefined);
  }

  function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      // A dropped request rejects instead of answering with an error.
      const result = await onDelete(password).catch(() => ({
        error: t.unavailable,
      }));
      setError(result.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.lead}
      trigger={
        <button
          type="button"
          className="touch-target inline-flex items-center gap-2 self-start rounded-full px-2 font-semibold text-error-fg underline outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Trash2 aria-hidden="true" className="size-5" />
          {t.open}
        </button>
      }
    >
      <form noValidate onSubmit={remove} className="flex w-full flex-col gap-4">
        <ul className="flex list-disc flex-col gap-1 pl-5 text-fg-secondary">
          {t.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <Label htmlFor={PASSWORD_ID}>{t.password}</Label>
          <PasswordInput
            id={PASSWORD_ID}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(undefined);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${HINT_ID} ${ERROR_ID}` : HINT_ID}
          />
          <p id={HINT_ID} className="text-sm text-fg-secondary">
            {t.passwordHint}
          </p>
          <div role="status">
            {error && <FieldError id={ERROR_ID}>{error}</FieldError>}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose
            render={<Button variant="ghost" size="lg" className={ACTION} />}
            disabled={pending}
          >
            {t.cancel}
          </DialogClose>
          <Button
            type="submit"
            variant="destructive"
            size="lg"
            disabled={password === '' || pending}
            className={ACTION}
          >
            {pending ? t.pending : t.confirm}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
