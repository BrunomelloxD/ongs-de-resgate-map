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

function token(name: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

export const Default: Story = {
  play: async ({ canvas }) => {
    const style = getComputedStyle(canvas.getByRole('textbox'));
    await expect(parseFloat(style.height)).toBe(52);
    await expect(style.backgroundColor).toBe(token('--bg-surface'));
    await expect(style.borderTopColor).toBe(token('--border-default'));
    // 1.5px snaps to 1px on a 1x screen.
    await expect(['1px', '1.5px']).toContain(style.borderTopWidth);
    await expect(style.borderTopLeftRadius).toBe('12px');
    await expect(style.fontSize).toBe('16px');
  },
};
export const WithValue: Story = { args: { defaultValue: 'Valor preenchido' } };
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: '12.345.678/0001-00' },
  play: async ({ canvas }) => {
    const style = getComputedStyle(canvas.getByRole('textbox'));
    await expect(style.borderTopWidth).toBe('2px');
    await expect(style.borderTopColor).toBe(token('--error'));
    await expect(style.backgroundImage).toContain('data:image/svg+xml');
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const TouchTarget: Story = {
  play: async ({ canvas }) => {
    const rect = canvas.getByRole('textbox').getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
  },
};
