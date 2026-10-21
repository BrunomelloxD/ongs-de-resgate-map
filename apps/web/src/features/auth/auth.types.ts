export type LoginField = 'email' | 'password';

/** `useActionState` state of the login form. */
export interface LoginState {
  /** Typed e-mail, kept after a failed attempt. */
  email: string;
  fieldErrors: Partial<Record<LoginField, string>>;
  /** Api refusal (AUTH-03, AUTH-04): never says which field is wrong. */
  formError?: string;
}

/** `useActionState` state of the "Esqueci minha senha" form. */
export interface ForgotPasswordState {
  email: string;
  /** Set on every 202: the answer never tells whether the account exists (AUTH-08). */
  sentMessage?: string;
  fieldError?: string;
  formError?: string;
}

export type ResetPasswordField = 'password' | 'confirmation';

/** `useActionState` state of the new password form. */
export interface ResetPasswordState {
  fieldErrors: Partial<Record<ResetPasswordField, string>>;
  /** AUTH-13: the link expired or was already used. */
  linkGone?: string;
  formError?: string;
}
