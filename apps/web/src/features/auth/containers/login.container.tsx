import { login } from '../actions/login';
import { LoginForm } from '../components/login-form.client';

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export interface LoginContainerProps {
  searchParams: Promise<SearchParams>;
}

/** `?email=` pre-fills the field (SIGN-12); `?senha=alterada` shows the AUTH-12 notice. */
export async function LoginContainer({ searchParams }: LoginContainerProps) {
  const params = await searchParams;

  return (
    <LoginForm
      action={login}
      defaultEmail={first(params['email']) ?? ''}
      passwordChanged={first(params['senha']) === 'alterada'}
    />
  );
}
