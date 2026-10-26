import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MapPin } from 'lucide-react';
import { expect, fn, userEvent } from 'storybook/test';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Botão', onClick: fn() },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'outline',
        'secondary',
        'ghost',
        'destructive',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: [
        'default',
        'xs',
        'sm',
        'lg',
        'icon',
        'icon-xs',
        'icon-sm',
        'icon-lg',
      ],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resolves a CSS custom property to the rgb() the browser computes, in the current theme. */
function token(name: string, property: 'color' | 'backgroundColor' = 'color') {
  const probe = document.createElement('span');
  probe.style[property] = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

const button = (canvas: { getByRole: (role: 'button') => HTMLElement }) =>
  getComputedStyle(canvas.getByRole('button'));

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const style = button(canvas);
    await expect(parseFloat(style.height)).toBe(52);
    // rounded-full is calc(infinity * 1px): a pill at any height.
    await expect(parseFloat(style.borderRadius)).toBeGreaterThan(26);
    await expect(style.backgroundColor).toBe(token('--brand-default'));
    await expect(style.color).toBe(token('--text-on-brand'));
    await expect(style.fontWeight).toBe('700');
    await userEvent.click(canvas.getByRole('button', { name: 'Botão' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <MapPin aria-hidden="true" />
        Encontrar ONGs perto de mim
      </>
    ),
  },
};

export const Outline: Story = {
  args: { variant: 'outline' },
  play: async ({ canvas }) => {
    const style = button(canvas);
    // 1.5px snaps to 1px on a 1x screen.
    await expect(['1px', '1.5px']).toContain(style.borderTopWidth);
    await expect(style.borderTopColor).toBe(token('--text-primary'));
    await expect(parseFloat(style.height)).toBe(52);
  },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
  play: async ({ canvas }) => {
    const style = button(canvas);
    await expect(style.backgroundColor).toBe(token('--brand-deep'));
    await expect(style.color).toBe(token('--text-on-brand-deep'));
  },
};

/** C-24: #157A43 with white text, 5.4:1 (A11Y-01). */
export const WhatsApp: Story = {
  args: { variant: 'whatsapp', children: 'Falar com a ONG no WhatsApp' },
  play: async ({ canvas }) => {
    const style = button(canvas);
    await expect(style.backgroundColor).toBe('rgb(21, 122, 67)');
    await expect(style.color).toBe('rgb(255, 255, 255)');
  },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Excluir animal' },
  play: async ({ canvas }) => {
    const style = button(canvas);
    // Design System Button/Danger: solid #B83A2E with white text.
    await expect(style.backgroundColor).toBe('rgb(184, 58, 46)');
    await expect(style.color).toBe('rgb(255, 255, 255)');
  },
};

export const Small: Story = {
  args: { size: 'sm' },
  play: async ({ canvas }) => {
    await expect(parseFloat(button(canvas).height)).toBe(44);
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const style = button(canvas);
    await expect(style.backgroundColor).toBe(token('--bg-surface-2'));
    await expect(style.color).toBe(token('--text-disabled'));
    await expect(style.opacity).toBe('1');
  },
};

const allSizes = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const;

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {allSizes.map((size) => (
        <Button key={size} {...args} size={size} aria-label={size}>
          {size.startsWith('icon') ? '+' : size}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const size of allSizes) {
      const rect = canvas
        .getByRole('button', { name: size })
        .getBoundingClientRect();
      await expect(rect.height).toBeGreaterThanOrEqual(44);
      if (size.startsWith('icon')) {
        await expect(rect.width).toBeGreaterThanOrEqual(44);
      }
    }
  },
};
