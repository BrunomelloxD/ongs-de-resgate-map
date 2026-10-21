import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { AboutValues, AvailabilityResult } from '../signup.types';
import { StepAbout, type StepAboutProps } from './step-about.client';

const FILLED: AboutValues = {
  cnpj: '11.222.333/0001-81',
  legalName: 'Associação Protetora Patas do Bairro',
  description:
    'Resgatamos cães e gatos abandonados na Zona Sul de São Paulo desde 2014. Todos saem castrados, vacinados e vermifugados.',
};
const EMPTY: AboutValues = { cnpj: '', legalName: '', description: '' };
const SIGN_05 =
  'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.';

// 1×1 green PNG, enough for the square preview.
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ),
  (char) => char.charCodeAt(0),
);

const answer = (result: AvailabilityResult) =>
  fn(async (_cnpj: string) => result);

/** Keeps the values like the SignupProvider does. */
function Stateful(props: StepAboutProps) {
  const [values, setValues] = useState(props.values);
  const [image, setImage] = useState(props.image);
  return (
    <StepAbout
      {...props}
      values={values}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      image={image}
      onImageChange={(file) => {
        props.onImageChange(file);
        setImage(file);
      }}
    />
  );
}

const meta = {
  title: 'Signup/StepAbout',
  component: StepAbout,
  args: {
    values: EMPTY,
    onChange: fn(),
    image: null,
    onImageChange: fn(),
    maxUploadMb: 5,
    checkCnpj: answer({ status: 'available' }),
    onContinue: fn(),
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepAbout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { values: FILLED },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByText(`${FILLED.description.length}/600`),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Contato' }),
    );
    await waitFor(() => expect(args.onContinue).toHaveBeenCalled());
  },
};

export const TypingCnpj: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('CNPJ'), '12abc34501de35');
    await expect(canvas.getByLabelText('CNPJ')).toHaveValue(
      '12.ABC.345/01DE-35',
    );
  },
};

export const CnpjTaken: Story = {
  args: {
    values: FILLED,
    checkCnpj: answer({ status: 'taken', error: SIGN_05 }),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Contato' }),
    );
    await expect(
      await canvas.findByRole('link', { name: SIGN_05 }),
    ).toBeVisible();
    await waitFor(() => expect(canvas.getByLabelText('CNPJ')).toHaveFocus());
    await expect(args.onContinue).not.toHaveBeenCalled();
  },
};

export const InvalidFields: Story = {
  args: {
    values: { ...FILLED, cnpj: '11.222.333/0001-82', description: 'curta' },
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Contato' }),
    );
    await expect(
      await canvas.findByRole('link', {
        name: 'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.',
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', {
        name: 'A descrição precisa ter de 30 a 600 caracteres.',
      }),
    ).toBeVisible();
  },
};

export const Unchecked: Story = {
  args: {
    values: FILLED,
    checkCnpj: answer({
      status: 'unchecked',
      error:
        'Não conseguimos conferir o CNPJ agora. Ele será conferido de novo ao criar a conta.',
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('CNPJ'));
    await userEvent.tab();
    await expect(
      await canvas.findByText(
        'Não conseguimos conferir o CNPJ agora. Ele será conferido de novo ao criar a conta.',
      ),
    ).toBeVisible();
  },
};

export const Checking: Story = {
  args: {
    values: FILLED,
    checkCnpj: fn(
      (_cnpj: string) => new Promise<AvailabilityResult>(() => undefined),
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Contato' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Conferindo o CNPJ…' }),
    ).toBeDisabled();
  },
};

export const ImageRejected: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.upload(
      canvas.getByLabelText('Logo ou foto da ONG'),
      new File(['gif'], 'logo.gif', { type: 'image/gif' }),
      { applyAccept: false },
    );
    await expect(
      canvas.getByText('Envie JPG, PNG ou WebP de até 5 MB.'),
    ).toBeVisible();
    await expect(args.onImageChange).not.toHaveBeenCalled();
  },
};

export const WithImage: Story = {
  play: async ({ canvas }) => {
    await userEvent.upload(
      canvas.getByLabelText('Logo ou foto da ONG'),
      new File([PNG], 'logo-patas.png', { type: 'image/png' }),
    );
    await expect(
      await canvas.findByRole('img', { name: 'Prévia da imagem da ONG' }),
    ).toBeVisible();
    await expect(canvas.getByText('Trocar imagem')).toBeVisible();
  },
};
