import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NgoIdentity } from './ngo-identity';

const meta = {
  title: 'Dashboard/NgoIdentity',
  component: NgoIdentity,
  args: {
    tone: 'header',
    name: 'Patas do Bairro',
    detail: 'Área da ONG',
    imageUrl: '/photos/signup-cat.webp',
  },
} satisfies Meta<typeof NgoIdentity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = {};
export const WithoutImage: Story = { args: { imageUrl: null } };
export const Sidebar: Story = {
  args: { tone: 'sidebar', detail: 'contato@patasdobairro.org' },
  decorators: [
    (Story) => (
      <div className="w-[300px] bg-brand-deep-pressed p-5">
        <Story />
      </div>
    ),
  ],
};
