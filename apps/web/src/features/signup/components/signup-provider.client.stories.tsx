import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SIGNUP_STORAGE_KEY,
  SignupProvider,
  useSignup,
} from './signup-provider.client';

/** A consumer for the story: one field kept in sessionStorage, one only in memory. */
function Fields() {
  const { data, signupRequestId, update } = useSignup();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="story-legal-name">Razão social</Label>
        <Input
          id="story-legal-name"
          value={data.about.legalName}
          onChange={(e) => update('about', { legalName: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="story-password">Senha</Label>
        <Input
          id="story-password"
          type="password"
          value={data.contact.password}
          onChange={(e) => update('contact', { password: e.target.value })}
        />
      </div>
      <p className="text-sm text-fg-secondary">
        signupRequestId: <output>{signupRequestId}</output>
      </p>
    </div>
  );
}

const meta = {
  title: 'Signup/SignupProvider',
  component: SignupProvider,
  args: { children: <Fields /> },
  beforeEach: () => {
    sessionStorage.removeItem(SIGNUP_STORAGE_KEY);
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignupProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MirrorsWithoutPassword: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Razão social'), 'Patas');
    await userEvent.type(canvas.getByLabelText('Senha'), 'segredo123');

    await waitFor(() =>
      expect(sessionStorage.getItem(SIGNUP_STORAGE_KEY)).toContain('Patas'),
    );
    await expect(sessionStorage.getItem(SIGNUP_STORAGE_KEY)).not.toContain(
      'segredo123',
    );
  },
};
