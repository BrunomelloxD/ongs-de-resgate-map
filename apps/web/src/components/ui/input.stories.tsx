import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { 'aria-label': 'Campo', placeholder: 'Digite aqui' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: 'Valor preenchido' } };
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'inválido' },
};
export const Disabled: Story = { args: { disabled: true } };
export const TouchTarget: Story = {
  play: async ({ canvas }) => {
    const rect = canvas.getByRole('textbox').getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
  },
};
