import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LoginState } from '../auth.types';
import { LoginForm } from './login-form.client';

function renderForm(
  answer: LoginState | Promise<LoginState> = {
    email: '',
    fieldErrors: {},
  },
  props: Partial<React.ComponentProps<typeof LoginForm>> = {},
) {
  const action = vi.fn(async (_state: LoginState, _data: FormData) => answer);
  render(<LoginForm action={action} {...props} />);
  return action;
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

describe('LoginForm', () => {
  it('AUTH-01: mostra e-mail, senha e os links "Esqueci minha senha" e "Cadastrar minha ONG"', () => {
    renderForm();

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('link', { name: 'Esqueci minha senha' }),
    ).toHaveAttribute('href', '/recuperar-senha');
    expect(
      screen.getByRole('link', { name: 'Cadastrar minha ONG' }),
    ).toHaveAttribute('href', '/cadastro/sobre');
  });

  it('SIGN-12: o e-mail vem pré-preenchido', () => {
    renderForm(undefined, { defaultEmail: 'contato@patas.org' });

    expect(screen.getByLabelText('E-mail')).toHaveValue('contato@patas.org');
  });

  it('envia e-mail e senha para a action', async () => {
    const action = renderForm();

    await userEvent.type(screen.getByLabelText('E-mail'), 'contato@patas.org');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha1234');
    await submit();

    const data = action.mock.calls[0]![1];
    expect(data.get('email')).toBe('contato@patas.org');
    expect(data.get('password')).toBe('senha1234');
  });

  it('AUTH-03: o erro da action aparece no resumo, nos dois campos, e o foco vai ao primeiro campo', async () => {
    renderForm({
      email: 'contato@patas.org',
      fieldErrors: {},
      formError: 'E-mail ou senha incorretos.',
    });

    await submit();

    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', {
        name: 'E-mail ou senha incorretos.',
      }),
    ).toHaveAttribute('href', '#login-email');
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('E-mail')).toHaveValue('contato@patas.org');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Senha')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('erros por campo aparecem no resumo e no campo; o foco vai ao primeiro inválido', async () => {
    renderForm({
      email: 'contato@patas.org',
      fieldErrors: { password: 'Informe a senha.' },
    });

    await submit();

    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', { name: 'Informe a senha.' }),
    ).toHaveAttribute('href', '#login-password');
    expect(screen.getByLabelText('Senha')).toHaveFocus();
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Informe a senha.',
    );
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
  });

  it('erro no e-mail fica ligado ao campo', async () => {
    renderForm({
      email: 'x',
      fieldErrors: { email: 'Informe um e-mail válido, como nome@ong.org.' },
    });

    await submit();

    await screen.findByRole('region', { name: 'Corrija para continuar' });
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@ong.org.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });

  it('enquanto envia, o botão fica desabilitado', async () => {
    renderForm(new Promise<LoginState>(() => undefined));

    await submit();

    expect(
      await screen.findByRole('button', { name: 'Entrando…' }),
    ).toBeDisabled();
  });

  it('AUTH-12: com a senha alterada, mostra "Senha alterada. Entre com a nova senha."', () => {
    renderForm(undefined, { passwordChanged: true });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Senha alterada. Entre com a nova senha.',
    );
  });

  it('sem a senha alterada, não mostra o aviso nem "Conta excluída."', () => {
    renderForm();

    expect(
      screen.queryByText('Senha alterada. Entre com a nova senha.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Conta excluída.')).not.toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
