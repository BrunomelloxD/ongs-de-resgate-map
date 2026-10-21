import { render, screen } from '@testing-library/react';
import type { LoginFormProps } from '../components/login-form.client';
import { LoginContainer } from './login.container';

const login = vi.hoisted(() => vi.fn());

vi.mock('../actions/login', () => ({ login }));
vi.mock('../components/login-form.client', () => ({
  LoginForm: (props: LoginFormProps) => (
    <p>
      form {props.action === login ? 'login' : 'outra'} [{props.defaultEmail}]{' '}
      {String(props.passwordChanged)}
    </p>
  ),
}));

const renderWith = async (params: Record<string, string | string[]>) =>
  render(await LoginContainer({ searchParams: Promise.resolve(params) }));

describe('LoginContainer', () => {
  it('sem parâmetros: e-mail vazio e sem aviso', async () => {
    await renderWith({});

    expect(screen.getByText('form login [] false')).toBeInTheDocument();
  });

  it('SIGN-12: ?email= pré-preenche o e-mail', async () => {
    await renderWith({ email: 'contato@patas.org' });

    expect(
      screen.getByText('form login [contato@patas.org] false'),
    ).toBeInTheDocument();
  });

  it('AUTH-12: ?senha=alterada liga o aviso', async () => {
    await renderWith({ senha: 'alterada', email: ['a@b.org', 'c@d.org'] });

    expect(screen.getByText('form login [a@b.org] true')).toBeInTheDocument();
  });

  it('outro valor de ?senha= não liga o aviso', async () => {
    await renderWith({ senha: 'x' });

    expect(screen.getByText('form login [] false')).toBeInTheDocument();
  });
});
