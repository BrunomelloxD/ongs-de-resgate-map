import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, userEvent } from 'storybook/test';
import { BottomSheet } from './bottom-sheet.client';

const meta = {
  title: 'UI/BottomSheet',
  component: BottomSheet,
  args: {
    label: 'Lista de ONGs',
    header: (
      <h2 className="text-2xl font-extrabold text-fg">8 ONGs perto de você</h2>
    ),
    children: (
      <ul className="flex flex-col gap-3 text-fg">
        {['Patas do Bairro', 'Gatil Sete Vidas', 'Lar do Caramelo'].map((n) => (
          <li key={n} className="rounded-card bg-surface p-4">
            <a href="#" className="touch-target inline-flex items-center">
              {n}
            </a>
          </li>
        ))}
      </ul>
    ),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="relative h-[600px] overflow-hidden bg-subtle">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Lista de ONGs' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};

export const Open: Story = { args: { defaultOpen: true } };

export const TapHandle: Story = {
  play: async ({ canvas }) => {
    const handle = canvas.getByRole('button', { name: 'Lista de ONGs' });
    await userEvent.click(handle);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(handle);
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
  },
};

export const DragUp: Story = {
  play: async ({ canvas }) => {
    const handle = canvas.getByRole('button', { name: 'Lista de ONGs' });
    await fireEvent.pointerDown(handle, { clientY: 500 });
    await fireEvent.pointerUp(handle, { clientY: 300 });
    await fireEvent.click(handle);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
  },
};
