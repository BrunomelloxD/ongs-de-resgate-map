import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { AddressValues } from '../signup.types';
import {
  StepAddress,
  type AddressSlot,
  type StepAddressProps,
} from './step-address.client';

const CONFIRMED = {
  lat: -23.5869,
  lng: -46.6347,
  confirmedAt: '2026-10-20T12:00:00.000Z',
};
const FILLED: AddressValues = {
  cep: '04015-012',
  street: 'Rua Joaquim Távora',
  number: '1240',
  complement: '',
  district: 'Vila Mariana',
  city: 'São Paulo',
  uf: 'SP',
  location: null,
};

/**
 * Stand-in for the AddressFields of `features/ngo-account`, which the app
 * passes in (a feature doesn't import another; see NgoAccount/AddressFields).
 */
function Fields({
  slot,
  values,
  onConfirm,
}: {
  slot: AddressSlot;
  values: AddressValues;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p>
        {values.street}, {values.number} · {values.city} – {values.uf}
      </p>
      <section id={`${slot.idPrefix}-location`} tabIndex={-1}>
        <button
          type="button"
          className="touch-target rounded-full border px-4"
          onClick={onConfirm}
        >
          Confirmar localização
        </button>
        {slot.errors.location && (
          <p className="text-error-fg">{slot.errors.location}</p>
        )}
      </section>
    </div>
  );
}

function Stateful(props: StepAddressProps) {
  const [values, setValues] = useState(props.values);
  return (
    <StepAddress
      {...props}
      values={values}
      renderFields={(slot) => (
        <Fields
          slot={slot}
          values={values}
          onConfirm={() => setValues((v) => ({ ...v, location: CONFIRMED }))}
        />
      )}
    />
  );
}

const meta = {
  title: 'Signup/StepAddress',
  component: StepAddress,
  args: {
    values: FILLED,
    renderFields: () => null,
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
} satisfies Meta<typeof StepAddress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NotConfirmed: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Horário' }),
    );
    await expect(
      canvas.getByRole('link', {
        name: 'Confirme a localização no mapa para continuar.',
      }),
    ).toBeVisible();
    await expect(args.onContinue).not.toHaveBeenCalled();
  },
};

export const Confirmed: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Confirmar localização' }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ir para Horário' }),
    );
    await waitFor(() => expect(args.onContinue).toHaveBeenCalled());
  },
};
