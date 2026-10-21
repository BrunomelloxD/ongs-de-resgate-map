import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { makeSignupData } from '../test-fixtures';
import { StepReview, type StepReviewProps } from './step-review.client';

const DEMO_TEXT =
  'Entendi que esta é uma demonstração e que a ONG, os animais e as fotos serão apagados em 7 dias.';
const TERMS = 'Li e aceito os Termos de uso e a Política de privacidade.';

/** Keeps the acceptances like the SignupProvider does. */
function Stateful(props: StepReviewProps) {
  const [data, setData] = useState(props.data);
  return (
    <StepReview
      {...props}
      data={data}
      onChange={(patch) =>
        setData((d) => ({ ...d, review: { ...d.review, ...patch } }))
      }
    />
  );
}

const meta = {
  title: 'Signup/StepReview',
  component: StepReview,
  args: {
    data: makeSignupData(),
    image: null,
    demo: { enabled: true, retentionDays: 7 },
    onChange: fn(),
    onSubmit: fn(),
    onBack: fn(),
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md bg-surface-2 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepReview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Criar conta' }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('link', { name: 'Editar Endereço' }),
    ).toHaveAttribute('href', '/cadastro/endereco');
  },
};

export const Accepted: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: TERMS }));
    await userEvent.click(canvas.getByRole('checkbox', { name: DEMO_TEXT }));
    await userEvent.click(canvas.getByRole('button', { name: 'Criar conta' }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};

export const DemoOff: Story = {
  args: { demo: { enabled: false, retentionDays: 7 } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(DEMO_TEXT)).toBeNull();
    await userEvent.click(canvas.getByRole('checkbox', { name: TERMS }));
    await expect(
      canvas.getByRole('button', { name: 'Criar conta' }),
    ).toBeEnabled();
  },
};

export const Pending: Story = {
  args: {
    data: {
      ...makeSignupData(),
      review: { termsAccepted: true, demoAccepted: true },
    },
    pending: true,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Criando a conta…' }),
    ).toBeDisabled();
  },
};

export const QuotaError: Story = {
  args: {
    data: {
      ...makeSignupData(),
      review: { termsAccepted: true, demoAccepted: true },
    },
    formError:
      'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'A demo atingiu o limite de ONGs.',
    );
  },
};
