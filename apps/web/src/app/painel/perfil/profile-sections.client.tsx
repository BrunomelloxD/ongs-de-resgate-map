'use client';

import dynamic from 'next/dynamic';
import { geocodeAddress, lookupCep } from '@/features/location/client';
import {
  ChangePasswordForm,
  DeleteAccountDialog,
  ngoAccountDictionary,
  ProfileForm,
  type ProfileFormProps,
} from '@/features/ngo-account/client';

const t = ngoAccountDictionary.page;

export const loadPinPicker = () =>
  import('@/components/ui/pin-picker.client').then((mod) => mod.PinPicker);

// PERF-01: Leaflet loads only in the browser.
const PinPicker = dynamic(loadPinPicker, { ssr: false });

type ChangePasswordProps = React.ComponentProps<typeof ChangePasswordForm>;
type DeleteAccountProps = React.ComponentProps<typeof DeleteAccountDialog>;

export interface ProfileSectionsProps extends Pick<
  ProfileFormProps,
  | 'ngo'
  | 'maxUploadMb'
  | 'tileUrl'
  | 'attribution'
  | 'notice'
  | 'updateProfile'
  | 'uploadImage'
> {
  changePassword: ChangePasswordProps['action'];
  deleteAccount: DeleteAccountProps['onDelete'];
}

/** Joins the profile, the password change and the account deletion of `ngo-account`
 * with the location actions and the map picker. */
export function ProfileSections({
  changePassword,
  deleteAccount,
  ...profile
}: ProfileSectionsProps) {
  return (
    <div className="flex flex-col gap-12">
      <ProfileForm
        {...profile}
        lookupCep={lookupCep}
        geocodeAddress={geocodeAddress}
        PinPicker={PinPicker}
        contactExtra={
          <a
            href="#alterar-senha"
            className="touch-target inline-flex items-center self-start rounded-full border border-border px-4 font-semibold outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t.changePassword}
          </a>
        }
      />
      <ChangePasswordForm action={changePassword} />
      <section
        aria-labelledby="delete-account-title"
        className="flex flex-col gap-3 rounded-card border border-error p-4"
      >
        <h2
          id="delete-account-title"
          className="font-heading text-2xl font-bold"
        >
          {t.dangerTitle}
        </h2>
        <p className="text-sm text-fg-secondary">{t.dangerLead}</p>
        <DeleteAccountDialog onDelete={deleteAccount} />
      </section>
    </div>
  );
}
