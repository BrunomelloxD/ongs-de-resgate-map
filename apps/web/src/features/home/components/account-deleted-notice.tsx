import { CircleCheck } from 'lucide-react';
import { homeDictionary as t } from '../home.dictionary';

/** PROF-08: shown on `/` right after the account is deleted. */
export function AccountDeletedNotice() {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-card bg-available-soft p-4 font-semibold text-available-fg"
    >
      <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
      {t.accountDeleted}
    </p>
  );
}
