import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Alert } from './alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  args: {
    variant: 'info',
    title: 'O pino está na entrada da ONG?',
    children:
      'Se não estiver, arraste o pino até o lugar certo. É ali que os visitantes vão chegar.',
  },
} satisfies Meta<typeof Alert>;

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

export const Info: Story = {
  play: async ({ canvasElement }) => {
    const alert = canvasElement.querySelector('[data-slot="alert"]')!;
    await expect(getComputedStyle(alert).backgroundColor).toBe(
      token('--gem-soft'),
    );
    await expect(getComputedStyle(alert).borderRadius).toBe('16px');
  },
};
export const Erro: Story = {
  args: {
    variant: 'error',
    title: 'Título do aviso',
    children: 'Texto de apoio do aviso.',
  },
  play: async ({ canvasElement }) => {
    const alert = canvasElement.querySelector('[data-slot="alert"]')!;
    await expect(getComputedStyle(alert).backgroundColor).toBe(
      token('--error-soft'),
    );
  },
};
export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Título do aviso',
    children: 'Texto de apoio do aviso.',
  },
  play: async ({ canvasElement }) => {
    const alert = canvasElement.querySelector('[data-slot="alert"]')!;
    await expect(getComputedStyle(alert).backgroundColor).toBe(
      token('--available-soft'),
    );
  },
};
export const TitleOnly: Story = {
  args: {
    variant: 'error',
    title: 'Arraste o pino até o local',
    children: undefined,
  },
};
