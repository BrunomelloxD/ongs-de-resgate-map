import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { LoginState } from '../auth.types';
import { LoginForm } from './login-form.client';

const answer = (state: LoginState) =>
  fn<(s: LoginState, d: FormData) => Promise<LoginState>>(async () => state);

const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  args: { action: answer({ email: '', fieldErrors: {} }) },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('E-mail'), 'contato@patas.org');
    await userEvent.type(canvas.getByLabelText('Senha'), 'senha1234');
    await userEvent.click(canvas.getByRole('button', { name: 'Entrar' }));
    await expect(args.action).toHaveBeenCalled();
  },
};

export const PrefilledEmail: Story = {
  args: { defaultEmail: 'contato@patas.org' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('E-mail')).toHaveValue(
      'contato@patas.org',
    );
  },
};

export const PasswordChanged: Story = {
  args: { passwordChanged: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Senha alterada. Entre com a nova senha.',
    );
  },
};

export const WrongCredentials: Story = {
  args: {
    action: answer({
      email: 'contato@patas.org',
      fieldErrors: {},
      formError: 'E-mail ou senha incorretos.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Entrar' }));
    await expect(
      await canvas.findByRole('link', { name: 'E-mail ou senha incorretos.' }),
    ).toBeVisible();
    // Focus moves in a passive effect, a moment after the summary shows up.
    await waitFor(() => expect(canvas.getByLabelText('E-mail')).toHaveFocus());
  },
};

export const TooManyAttempts: Story = {
  args: {
    action: answer({
      email: 'contato@patas.org',
      fieldErrors: {},
      formError: 'Muitas tentativas. Tente de novo em 15 minutos.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Entrar' }));
    await expect(
      await canvas.findByRole('link', {
        name: 'Muitas tentativas. Tente de novo em 15 minutos.',
      }),
    ).toBeVisible();
  },
};

export const FieldErrors: Story = {
  args: {
    action: answer({
      email: 'contato',
      fieldErrors: {
        email: 'Informe um e-mail válido, como nome@ong.org.',
        password: 'Informe a senha.',
      },
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Entrar' }));
    await expect(
      await canvas.findByRole('link', { name: 'Informe a senha.' }),
    ).toBeVisible();
    // Focus moves in a passive effect, a moment after the summary shows up.
    await waitFor(() => expect(canvas.getByLabelText('E-mail')).toHaveFocus());
    await expect(canvas.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Informe a senha.',
    );
  },
};

export const Pending: Story = {
  args: {
    action: fn<(s: LoginState, d: FormData) => Promise<LoginState>>(
      () => new Promise<LoginState>(() => undefined),
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Entrar' }));
    await expect(
      await canvas.findByRole('button', { name: 'Entrando…' }),
    ).toBeDisabled();
  },
};
