import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent } from 'storybook/test';
import { Label } from './label';
import { PasswordInput } from './password-input.client';

const meta = {
  title: 'UI/PasswordInput',
  component: PasswordInput,
  args: { id: 'senha', defaultValue: 'patas2026x' },
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="senha">Senha</Label>
      <PasswordInput {...args} />
    </div>
  ),
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hidden: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Senha')).toHaveAttribute(
      'type',
      'password',
    );
    const eye = canvas.getByRole('button', { name: 'Mostrar senha' });
    const rect = eye.getBoundingClientRect();
    await expect(rect.width).toBeGreaterThanOrEqual(44);
    await expect(rect.height).toBeGreaterThanOrEqual(44);
  },
};

export const Shown: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Mostrar senha' }),
    );
    await expect(canvas.getByLabelText('Senha')).toHaveAttribute(
      'type',
      'text',
    );
  },
};

export const Invalid: Story = { args: { 'aria-invalid': true } };
