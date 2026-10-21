import {
  aboutSchema,
  addressSchema,
  contactSchema,
  hoursSchema,
} from './schemas/signup.schema';
import type { SignupData, SignupStep } from './signup.types';
import { SIGNUP_STEPS } from './steps';

const VALID: Record<
  Exclude<SignupStep, 'review'>,
  (data: SignupData) => boolean
> = {
  about: (data) => aboutSchema.safeParse(data.about).success,
  contact: (data) => contactSchema.safeParse(data.contact).success,
  address: (data) => addressSchema.safeParse(data.address).success,
  hours: (data) => hoursSchema.safeParse(data.hours).success,
};

/**
 * The first step before `step` whose data isn't valid, or null when they all
 * are. Opening a step straight from the URL goes back to it (SIGN-01, SIGN-02).
 */
export function firstPendingStep(
  data: SignupData,
  step: SignupStep,
): SignupStep | null {
  const index = SIGNUP_STEPS.findIndex((s) => s.step === step);
  for (const { step: before } of SIGNUP_STEPS.slice(0, index)) {
    if (!VALID[before as keyof typeof VALID](data)) return before;
  }
  return null;
}
