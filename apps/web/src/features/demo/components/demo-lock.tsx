import { Alert } from '@/components/ui/alert';
import { demoDictionary } from '../demo.dictionary';

/** DEP-19, DEP-20: says why the form can't be sent. */
export function DemoLockedNotice() {
  return (
    <Alert
      variant="info"
      role="status"
      title={demoDictionary.locked.title}
      data-slot="demo-locked-notice"
    >
      {demoDictionary.locked.text}
    </Alert>
  );
}

export interface DemoLockProps {
  /** `locked` of GET /demo (AD-008). */
  locked: boolean;
  children: React.ReactNode;
}

/**
 * Locked demo: the screen stays visible, but every field and button inside is
 * disabled by the fieldset (links still work). Open demo: only the children.
 */
export function DemoLock({ locked, children }: DemoLockProps) {
  if (!locked) return children;

  return (
    <div className="flex flex-col gap-6">
      <DemoLockedNotice />
      <fieldset disabled data-slot="demo-lock" className="min-w-0">
        {children}
      </fieldset>
    </div>
  );
}
