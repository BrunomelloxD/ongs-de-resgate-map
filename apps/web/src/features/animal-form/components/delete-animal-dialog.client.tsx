'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose } from '@/components/ui/dialog.client';
import { FieldError } from '@/components/ui/error-summary';
import { useAnnounce } from '@/components/ui/live-region.client';
import { animalFormDictionary } from '../animal-form.dictionary';
import type { DeleteAnimal, SetAvailability } from '../animal-form.types';

const t = animalFormDictionary.delete;

export interface DeleteAnimalDialogProps {
  animalId: string;
  name: string;
  /** The `deleteAnimal` Server Action: success redirects to /painel. */
  onDelete: DeleteAnimal;
  /** `toggleAvailability`, called with `false`. */
  onMarkUnavailable: SetAvailability;
}

const ACTION = 'w-full sm:w-auto';

/** AFORM-15, AFORM-16: confirms the deletion and suggests marking as unavailable. */
export function DeleteAnimalDialog({
  animalId,
  name,
  onDelete,
  onMarkUnavailable,
}: DeleteAnimalDialogProps) {
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    setError(undefined);
  }

  function remove() {
    setError(undefined);
    startTransition(async () => {
      // A dropped request rejects instead of answering { ok: false }.
      const result = await onDelete(animalId).catch(() => ({
        ok: false as const,
        error: t.failed,
      }));
      setError(result.error);
      announce(result.error);
    });
  }

  function markUnavailable() {
    setError(undefined);
    startTransition(async () => {
      const { ok } = await onMarkUnavailable(animalId, false).catch(() => ({
        ok: false,
      }));
      if (ok) {
        setOpen(false);
        announce(t.markedUnavailable(name));
      } else {
        setError(t.markFailed);
        announce(t.markFailed);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title(name)}
      description={t.description(name)}
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
      {error && (
        <FieldError id="delete-animal-error" className="w-full">
          {error}
        </FieldError>
      )}
      <Button
        variant="destructive"
        size="lg"
        disabled={pending}
        onClick={remove}
        className={ACTION}
      >
        {t.confirm}
      </Button>
      <Button
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={markUnavailable}
        className={ACTION}
      >
        {t.markUnavailable}
      </Button>
      <DialogClose
        render={<Button variant="ghost" size="lg" className={ACTION} />}
        disabled={pending}
      >
        {t.cancel}
      </DialogClose>
    </Dialog>
  );
}
