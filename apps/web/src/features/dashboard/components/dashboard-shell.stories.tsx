import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { DashboardShell } from './dashboard-shell';

const meta = {
  title: 'Dashboard/DashboardShell',
  component: DashboardShell,
  parameters: { layout: 'fullscreen' },
  args: {
    ngo: {
      legalName: 'Patas do Bairro',
      email: 'contato@patasdobairro.org',
      imageUrl: '/photos/signup-cat.webp',
      slug: 'patas-do-bairro',
    },
    currentPath: '/painel',
    logoutAction: fn(async () => {}),
    children: (
      <main className="p-6">
        <h1 className="font-heading text-4xl font-extrabold">Seus animais</h1>
      </main>
    ),
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[700px] flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sidebar from 1024px, the phone header below it, whatever the test browser width. */
async function check(canvasElement: HTMLElement) {
  const wide = window.matchMedia('(min-width: 64rem)').matches;
  const sidebar = canvasElement.querySelector(
    '[data-slot="dashboard-sidebar"]',
  )!;
  await expect(getComputedStyle(sidebar).display === 'none').toBe(!wide);
  if (wide) await expect(sidebar.getBoundingClientRect().width).toBe(300);
}

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => check(canvasElement),
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvasElement }) => check(canvasElement),
};

export const ProfilePage: Story = { args: { currentPath: '/painel/perfil' } };
