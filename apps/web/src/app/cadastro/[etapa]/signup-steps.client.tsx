'use client';

import dynamic from 'next/dynamic';
import { geocodeAddress, lookupCep } from '@/features/location/client';
import { AddressFields, HoursFields } from '@/features/ngo-account/client';
import { SignupWizard, type SignupSlug } from '@/features/signup/client';
import { createAccount } from '../actions';

export const loadPinPicker = () =>
  import('@/components/ui/pin-picker.client').then((mod) => mod.PinPicker);

// PERF-01: Leaflet loads only in the browser, on the address step.
const PinPicker = dynamic(loadPinPicker, { ssr: false });

export interface SignupStepsProps {
  slug: SignupSlug;
  maxUploadMb: number;
  tileUrl: string;
  attribution: string;
  demo: { enabled: boolean; retentionDays: number };
}

/** Joins the signup with the address and hours fields of `ngo-account` and the location actions. */
export function SignupSteps({
  slug,
  maxUploadMb,
  tileUrl,
  attribution,
  demo,
}: SignupStepsProps) {
  return (
    <SignupWizard
      slug={slug}
      maxUploadMb={maxUploadMb}
      demo={demo}
      createAccount={createAccount}
      renderAddressFields={(slot) => (
        <AddressFields
          {...slot}
          lookupCep={lookupCep}
          geocodeAddress={geocodeAddress}
          PinPicker={PinPicker}
          tileUrl={tileUrl}
          attribution={attribution}
        />
      )}
      renderHoursFields={(slot) => <HoursFields {...slot} />}
    />
  );
}
