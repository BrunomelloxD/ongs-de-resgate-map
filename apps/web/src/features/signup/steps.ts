import type { SignupSlug, SignupStep } from './signup.types';

/** The 5 steps in order (SIGN-01): the URL slug and the name the stepper shows. */
export const SIGNUP_STEPS: readonly {
  step: SignupStep;
  slug: SignupSlug;
  label: string;
}[] = [
  { step: 'about', slug: 'sobre', label: 'Sobre a ONG' },
  { step: 'contact', slug: 'contato', label: 'Contato e acesso' },
  { step: 'address', slug: 'endereco', label: 'Endereço' },
  { step: 'hours', slug: 'horario', label: 'Horário' },
  { step: 'review', slug: 'revisao', label: 'Revisão' },
];

export const SIGNUP_BASE_PATH = '/cadastro';

export const slugOf = (step: SignupStep): SignupSlug =>
  SIGNUP_STEPS.find((s) => s.step === step)!.slug;

export const stepPath = (step: SignupStep) =>
  `${SIGNUP_BASE_PATH}/${slugOf(step)}`;
