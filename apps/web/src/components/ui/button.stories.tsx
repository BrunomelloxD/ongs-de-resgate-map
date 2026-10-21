import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Botão' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Outline: Story = { args: { variant: 'outline' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Excluir' },
};
export const Small: Story = { args: { size: 'sm' } };
export const Disabled: Story = { args: { disabled: true } };

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
