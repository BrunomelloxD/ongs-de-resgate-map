/** Step 1 as typed (masked CNPJ). */
export interface AboutValues {
  cnpj: string;
  legalName: string;
  description: string;
}

/** Step 2 as typed (masked WhatsApp). */
export interface ContactValues {
  email: string;
  whatsapp: string;
  password: string;
  confirmation: string;
}

/** Set when the NGO taps "Confirmar localização" (SIGN-21, SIGN-22). */
export interface ConfirmedLocation {
  lat: number;
  lng: number;
  /** ISO date of the confirmation. */
  confirmedAt: string;
}

export interface AddressValues {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  uf: string;
  location: ConfirmedLocation | null;
}

export interface DayValues {
  /** 0 = Sunday. */
  dayOfWeek: number;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface HoursValues {
  openingHours: DayValues[];
}

export interface ReviewValues {
  termsAccepted: boolean;
  demoAccepted: boolean;
}

/** Everything the wizard collects, by step. */
export interface SignupData {
  about: AboutValues;
  contact: ContactValues;
  address: AddressValues;
  hours: HoursValues;
  review: ReviewValues;
}

export type SignupStep = keyof SignupData;

/** Answer of `checkCnpj` and `checkEmail`, with the message for the field. */
export type AvailabilityResult =
  | { status: 'available' }
  /** Already has an account (SIGN-05, SIGN-12): blocks the step. */
  | { status: 'taken'; error: string }
  /** Invalid value: blocks the step. */
  | { status: 'invalid'; error: string }
  /** Throttle or api down: a notice only; the final submit checks again (SIGN-31). */
  | { status: 'unchecked'; error: string };

/** Slug of a step in the URL (`/cadastro/{slug}`). */
export type SignupSlug =
  'sobre' | 'contato' | 'endereco' | 'horario' | 'revisao';

/** What `createAccount` answers when it doesn't open `/painel`. */
export interface CreateAccountError {
  ok: false;
  /** Step to go back to (SIGN-31), or null to stay on the review. */
  step: SignupSlug | null;
  /** Field in conflict, shown on its step (SIGN-31). */
  field?: 'cnpj' | 'email';
  error: string;
}

/** What the wizard sends to `createAccount`, as JSON in the `data` field. */
export interface CreateAccountPayload extends SignupData {
  signupRequestId: string;
}
