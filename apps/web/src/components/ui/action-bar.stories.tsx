import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { ActionBar } from './action-bar';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/ActionBar',
  component: ActionBar,
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <>
        <Button variant="outline">Voltar</Button>
        <Button type="submit">Ir para Endereço</Button>
      </>
    ),
  },
  render: (args) => (
    <form className="mx-auto flex max-w-[560px] flex-col gap-4 p-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Label htmlFor={`f${i}`}>{`Campo ${i + 1}`}</Label>
          <Input id={`f${i}`} />
        </div>
      ))}
      <ActionBar {...args} />
    </form>
  ),
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fixed at the bottom below 1024px; in the flow above it. */
async function check(canvasElement: HTMLElement) {
  const bar = canvasElement.querySelector('[data-slot="action-bar"]')!;
  const wide = window.matchMedia('(min-width: 64rem)').matches;
  await expect(getComputedStyle(bar).position).toBe(wide ? 'static' : 'fixed');
  for (const button of bar.querySelectorAll('button')) {
    await expect(button.getBoundingClientRect().height).toBe(52);
  }
}

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvasElement }) => check(canvasElement),
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => check(canvasElement),
};

export const WithHint: Story = {
  args: {
    layout: 'stretch',
    hint: 'Abre o WhatsApp da ONG com uma mensagem pronta sobre o Caramelo.',
    children: <Button>Quero adotar o Caramelo</Button>,
  },
  play: async ({ canvasElement }) => check(canvasElement),
};
