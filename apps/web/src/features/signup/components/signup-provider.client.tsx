'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { SignupData, SignupStep } from '../signup.types';

export const SIGNUP_STORAGE_KEY = 'ah_signup';

// SPEC_DEVIATION: the spec doesn't define the initial hours; Monday to Saturday
// 09:00–18:00 and Sunday closed, so the NGO only adjusts.
export const EMPTY_SIGNUP: SignupData = {
  about: { cnpj: '', legalName: '', description: '' },
  contact: { email: '', whatsapp: '', password: '', confirmation: '' },
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    uf: '',
    location: null,
  },
  hours: {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) =>
      dayOfWeek === 0
        ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
        : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
    ),
  },
  review: { termsAccepted: false, demoAccepted: false },
};

export interface SignupContextValue {
  data: SignupData;
  /** Same uuid for the whole wizard, so a repeated submit creates one NGO (SIGN-32). */
  signupRequestId: string;
  /** False until the saved data is read back, right after mounting. */
  ready: boolean;
  /** NGO image: kept in memory only, never in sessionStorage. */
  image: File | null;
  update: <S extends SignupStep>(
    step: S,
    values: Partial<SignupData[S]>,
  ) => void;
  setImage: (image: File | null) => void;
  /** CNPJ or e-mail taken at the final submit (SIGN-31), shown on its step. In memory only. */
  conflict: SignupConflict | null;
  setConflict: (conflict: SignupConflict | null) => void;
  /** Forgets the wizard, sessionStorage included, after the account is created. */
  reset: () => void;
}

export interface SignupConflict {
  field: 'cnpj' | 'email';
  error: string;
}

const SignupContext = createContext<SignupContextValue | null>(null);

interface Saved {
  signupRequestId: string;
  data: SignupData;
}

/** The saved wizard, or null when there is none or it can't be read. */
function readSaved(): Saved | null {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(SIGNUP_STORAGE_KEY) ?? 'null',
    ) as Partial<Saved> | null;
    const stored = saved?.data;
    if (typeof saved?.signupRequestId !== 'string' || !stored) return null;

    // Step by step over the defaults: the password fields come back empty.
    const data = Object.fromEntries(
      Object.entries(EMPTY_SIGNUP).map(([step, empty]) => [
        step,
        { ...empty, ...stored[step as SignupStep] },
      ]),
    ) as unknown as SignupData;
    return { signupRequestId: saved.signupRequestId, data };
  } catch {
    return null;
  }
}

/**
 * Wizard state between the steps (SIGN-02), mirrored in sessionStorage
 * without the password and its confirmation, which live in memory only.
 */
export function SignupProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(EMPTY_SIGNUP);
  const [signupRequestId, setSignupRequestId] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [conflict, setConflict] = useState<SignupConflict | null>(null);
  const ready = signupRequestId !== '';

  // Storage and randomUUID only after mounting: the layout is prerendered.
  useEffect(() => {
    const saved = readSaved();
    if (saved) setData(saved.data);
    setSignupRequestId(saved?.signupRequestId ?? crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (!ready) return;
    const {
      password: _password,
      confirmation: _confirmation,
      ...contact
    } = data.contact;
    sessionStorage.setItem(
      SIGNUP_STORAGE_KEY,
      JSON.stringify({ signupRequestId, data: { ...data, contact } }),
    );
  }, [ready, signupRequestId, data]);

  const update = useCallback<SignupContextValue['update']>((step, values) => {
    setData((current) => ({
      ...current,
      [step]: { ...current[step], ...values },
    }));
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(SIGNUP_STORAGE_KEY);
    setData(EMPTY_SIGNUP);
    setImage(null);
    setConflict(null);
    // A new wizard is a new signup (SIGN-32).
    setSignupRequestId(crypto.randomUUID());
  }, []);

  const value = useMemo(
    () => ({
      data,
      signupRequestId,
      ready,
      image,
      update,
      setImage,
      conflict,
      setConflict,
      reset,
    }),
    [data, signupRequestId, ready, image, update, conflict, reset],
  );

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
}

export function useSignup(): SignupContextValue {
  const value = useContext(SignupContext);
  if (!value) throw new Error('useSignup must be used inside SignupProvider.');
  return value;
}
