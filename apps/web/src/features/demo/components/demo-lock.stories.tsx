import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DemoLock, DemoLockedNotice } from './demo-lock';

const meta = {
  title: 'Demo/DemoLock',
  component: DemoLock,
  args: {
    locked: true,
    children: (
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="story-email">E-mail</Label>
          <Input id="story-email" type="email" />
        </div>
        <Button type="submit" size="lg">
          Enviar link
        </Button>
      </form>
    ),
  },
} satisfies Meta<typeof DemoLock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** AD-008: the form is visible and disabled. */
export const Locked: Story = {};

export const Open: Story = { args: { locked: false } };

export const Notice: Story = { render: () => <DemoLockedNotice /> };
