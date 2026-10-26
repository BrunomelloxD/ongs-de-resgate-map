import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { AuthShell } from './auth-shell';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const PHOTO = { src: '/photos/login-puppy.webp', width: 600, height: 780 };
const PHRASE =
  'Cada animal que você cadastra aparece no mapa para quem quer adotar perto de casa.';

const form = (
  <form className="flex flex-col gap-4">
    <h1 className="text-4xl font-extrabold">Entrar na área da ONG</h1>
    <Label htmlFor="email">E-mail</Label>
    <Input id="email" type="email" />
    <Button type="submit">Entrar</Button>
  </form>
);

const login = () => (
  <AuthShell variant="login" photo={PHOTO} phrase={PHRASE}>
    {form}
  </AuthShell>
);

// The props are a union (login or signup), so each story renders its own shell.
const meta = {
  title: 'UI/AuthShell',
  component: AuthShell,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex min-h-[900px] flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The panel shows only from 1024px, whatever width the test browser has. */
async function expectPanelByWidth(canvasElement: HTMLElement) {
  const panel = canvasElement.querySelector('[data-slot="auth-shell-panel"]')!;
  const wide = window.matchMedia('(min-width: 64rem)').matches;
  await expect(getComputedStyle(panel).display).toBe(wide ? 'flex' : 'none');
  const form = canvasElement.querySelector('main')!.getBoundingClientRect();
  await expect(form.width).toBeGreaterThanOrEqual(320);
}

export const LoginDesktop: Story = {
  render: login,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => expectPanelByWidth(canvasElement),
};

export const LoginMobile: Story = {
  render: login,
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvasElement }) => expectPanelByWidth(canvasElement),
};

export const SignupDesktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  render: () => (
    <AuthShell
      variant="signup"
      photo={{ src: '/photos/signup-cat.webp', width: 400, height: 520 }}
      title="Cadastre sua ONG"
      text="Leva uns 5 minutos. Depois você já pode cadastrar os animais disponíveis."
      footer={
        <p>
          Já tem conta?{' '}
          <a href="/entrar" className="font-bold text-white underline">
            Entrar
          </a>
        </p>
      }
    >
      {form}
    </AuthShell>
  ),
  play: async ({ canvasElement }) => expectPanelByWidth(canvasElement),
};
