import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { DashboardNav } from './dashboard-nav';

const meta = {
  title: 'Dashboard/DashboardNav',
  component: DashboardNav,
  args: {
    currentPath: '/painel',
    slug: 'patas-do-bairro',
    logoutAction: fn(async () => {}),
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] bg-brand-deep-pressed p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Animals: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Animais' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

export const Profile: Story = { args: { currentPath: '/painel/perfil' } };
