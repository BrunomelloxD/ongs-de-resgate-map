import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { ForgotPasswordState } from '../auth.types';
import { ForgotPasswordForm } from './forgot-password-form.client';

type Action = (
  s: ForgotPasswordState,
  d: FormData,
) => Promise<ForgotPasswordState>;

const answer = (state: Omit<ForgotPasswordState, 'email'>) =>
  fn<Action>(async (_s, data) => ({
    email: data.get('email') as string,
    ...state,
  }));

const meta = {
  title: 'Auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
  args: {
    action: answer({
      sentMessage: 'Se houver uma conta com este e-mail, enviamos um link.',
    }),
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <div className="mx-auto max-w-md">
          <Story />
        </div>
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sent: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('E-mail'), 'contato@patas.org');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar link' }));
    await expect(
      await canvas.findByRole('heading', { name: 'Confira seu e-mail' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', {
        name: /^Reenviar em 1:00|^Reenviar em 0:5/,
      }),
    ).toBeDisabled();
  },
};

export const TooManyRequests: Story = {
  args: {
    action: answer({ formError: 'Muitos pedidos. Tente de novo em 1 hora.' }),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('E-mail'), 'contato@patas.org');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar link' }));
    await expect(
      await canvas.findByRole('link', {
        name: 'Muitos pedidos. Tente de novo em 1 hora.',
      }),
    ).toBeVisible();
    // Focus moves in a passive effect, a moment after the summary shows up.
    await waitFor(() => expect(canvas.getByLabelText('E-mail')).toHaveFocus());
  },
};

export const InvalidEmail: Story = {
  args: {
    action: answer({
      fieldError: 'Informe um e-mail válido, como nome@ong.org.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar link' }));
    await expect(
      await canvas.findByRole('link', {
        name: 'Informe um e-mail válido, como nome@ong.org.',
      }),
    ).toBeVisible();
  },
};

export const Pending: Story = {
  args: {
    action: fn<Action>(() => new Promise<ForgotPasswordState>(() => undefined)),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar link' }));
    await expect(
      await canvas.findByRole('button', { name: 'Enviando…' }),
    ).toBeDisabled();
  },
};
