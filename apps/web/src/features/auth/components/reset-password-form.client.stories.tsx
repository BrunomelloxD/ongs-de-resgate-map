import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { ResetPasswordState } from '../auth.types';
import { ResetPasswordForm } from './reset-password-form.client';

type Action = (
  s: ResetPasswordState,
  d: FormData,
) => Promise<ResetPasswordState>;

const answer = (state: ResetPasswordState) => fn<Action>(async () => state);

const meta = {
  title: 'Auth/ResetPasswordForm',
  component: ResetPasswordForm,
  args: { action: answer({ fieldErrors: {} }) },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TypingRules: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Nova senha'), 'abc1');
    await expect(
      canvas.getByText('Ao menos um número', { exact: false }),
    ).toHaveTextContent('(atendida)');
    await expect(
      canvas.getByText('8 ou mais caracteres', { exact: false }),
    ).toHaveTextContent('(não atendida)');
  },
};

export const LinkGone: Story = {
  args: {
    action: answer({
      fieldErrors: {},
      linkGone: 'Este link expirou ou já foi usado.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar nova senha' }),
    );
    await expect(
      await canvas.findByRole('link', { name: 'Pedir outro link' }),
    ).toHaveAttribute('href', '/recuperar-senha');
  },
};

export const PasswordsDiffer: Story = {
  args: {
    action: answer({
      fieldErrors: { confirmation: 'As senhas não conferem.' },
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar nova senha' }),
    );
    await expect(
      await canvas.findByRole('link', { name: 'As senhas não conferem.' }),
    ).toBeVisible();
    // Focus moves in a passive effect, a moment after the summary shows up.
    await waitFor(() =>
      expect(canvas.getByLabelText('Confirme a nova senha')).toHaveFocus(),
    );
  },
};

export const Pending: Story = {
  args: {
    action: fn<Action>(() => new Promise<ResetPasswordState>(() => undefined)),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Salvar nova senha' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Salvando…' }),
    ).toBeDisabled();
  },
};
