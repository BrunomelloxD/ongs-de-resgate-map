import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { AvailabilityResult, ContactValues } from '../signup.types';
import { StepContact, type StepContactProps } from './step-contact.client';

const FILLED: ContactValues = {
  email: 'contato@patasdobairro.org',
  whatsapp: '(11) 98765-4321',
  password: 'senha1234',
  confirmation: 'senha1234',
};
const EMPTY: ContactValues = {
  email: '',
  whatsapp: '',
  password: '',
  confirmation: '',
};

const answer = (result: AvailabilityResult) =>
  fn(async (_email: string) => result);

/** Keeps the values like the SignupProvider does. */
function Stateful(props: StepContactProps) {
  const [values, setValues] = useState(props.values);
  return (
    <StepContact
      {...props}
      values={values}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
    />
  );
}

const meta = {
  title: 'Signup/StepContact',
  component: StepContact,
  args: {
    values: EMPTY,
    onChange: fn(),
    checkEmail: answer({ status: 'available' }),
    onContinue: fn(),
    onBack: fn(),
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepContact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { values: FILLED },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Endereço' }),
    );
    await waitFor(() => expect(args.onContinue).toHaveBeenCalled());
  },
};

export const TypingPassword: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('WhatsApp'), '11987654321');
    await expect(canvas.getByLabelText('WhatsApp')).toHaveValue(
      '(11) 98765-4321',
    );
    await userEvent.type(canvas.getByLabelText('Senha'), 'abc1');
    await expect(
      canvas.getByText('Ao menos um número', { exact: false }),
    ).toHaveTextContent('(atendida)');
    await expect(
      canvas.getByText('8 ou mais caracteres', { exact: false }),
    ).toHaveTextContent('(não atendida)');
  },
};

export const EmailTaken: Story = {
  args: {
    values: FILLED,
    checkEmail: answer({
      status: 'taken',
      error: 'Este e-mail já tem cadastro.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Endereço' }),
    );
    await expect(
      await canvas.findByRole('link', { name: 'Entrar com este e-mail' }),
    ).toHaveAttribute('href', '/entrar?email=contato%40patasdobairro.org');
    await expect(
      canvas.getByRole('link', { name: 'Recuperar senha' }),
    ).toHaveAttribute('href', '/recuperar-senha');
    await waitFor(() => expect(canvas.getByLabelText('E-mail')).toHaveFocus());
  },
};

export const PasswordsDiffer: Story = {
  args: { values: { ...FILLED, confirmation: 'outra1234' } },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Endereço' }),
    );
    await expect(
      await canvas.findByRole('link', { name: 'As senhas não conferem.' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByLabelText('Confirmar senha')).toHaveFocus(),
    );
  },
};

export const Checking: Story = {
  args: {
    values: FILLED,
    checkEmail: fn(
      (_email: string) => new Promise<AvailabilityResult>(() => undefined),
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Endereço' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Conferindo o e-mail…' }),
    ).toBeDisabled();
  },
};
