import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { ChangePasswordState } from '../ngo-account.types';
import {
  ChangePasswordForm,
  type ChangePasswordFormProps,
} from './change-password-form.client';

const answer = (state: ChangePasswordState) =>
  fn<ChangePasswordFormProps['action']>(async () => state);

const meta = {
  title: 'NgoAccount/ChangePasswordForm',
  component: ChangePasswordForm,
  args: { action: answer({ fieldErrors: {} }) },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl px-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChangePasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fill(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  current = 'antiga123',
) {
  await userEvent.type(canvas.getByLabelText('Senha atual'), current);
  await userEvent.type(canvas.getByLabelText('Nova senha'), 'novaSenha99');
  await userEvent.type(
    canvas.getByLabelText('Confirme a nova senha'),
    'novaSenha99',
  );
  await userEvent.click(canvas.getByRole('button', { name: 'Alterar senha' }));
}

export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Senha atual')).toHaveValue('');
    await expect(canvas.getByText('A senha precisa ter:')).toBeVisible();
  },
};

export const Changed: Story = {
  args: {
    action: answer({
      fieldErrors: {},
      success: {
        message: 'Senha alterada. As outras sessões foram encerradas.',
        at: 1,
      },
    }),
  },
  play: async ({ canvas }) => {
    await fill(canvas);
    await expect(
      await canvas.findByText(
        'Senha alterada. As outras sessões foram encerradas.',
      ),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Nova senha')).toHaveValue('');
  },
};

export const WrongCurrentPassword: Story = {
  args: {
    action: answer({
      fieldErrors: { currentPassword: 'Senha atual incorreta.' },
    }),
  },
  play: async ({ canvas }) => {
    await fill(canvas, 'errada123');
    await waitFor(() =>
      expect(canvas.getByLabelText('Senha atual')).toHaveAccessibleDescription(
        'Senha atual incorreta.',
      ),
    );
    await waitFor(() =>
      expect(canvas.getByLabelText('Senha atual')).toHaveFocus(),
    );
  },
};

export const Pending: Story = {
  args: {
    action: fn<ChangePasswordFormProps['action']>(() => new Promise(() => {})),
  },
  play: async ({ canvas }) => {
    await fill(canvas);
    await expect(
      canvas.getByRole('button', { name: 'Alterando…' }),
    ).toBeDisabled();
  },
};
