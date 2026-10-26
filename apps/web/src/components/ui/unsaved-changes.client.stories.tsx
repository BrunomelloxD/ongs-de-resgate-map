import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';
import { GuardedLink, UnsavedChangesProvider } from './unsaved-changes.client';
import { UNSAVED_CHANGES_TEXT } from './ui.dictionary';

const meta = {
  title: 'UI/GuardedLink',
  component: GuardedLink,
  args: {
    href: '/painel',
    children: 'Voltar para o painel',
    className: 'touch-target inline-flex items-center font-semibold underline',
  },
} satisfies Meta<typeof GuardedLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A form with unsaved changes on the page. */
const dirtyForm = (Story: () => React.ReactNode) => (
  <UnsavedChangesProvider dirty>
    <Story />
  </UnsavedChangesProvider>
);

const linkOf = () => screen.getByRole('link', { name: 'Voltar para o painel' });

/** DIRTY-03: nothing to lose, the link just navigates. */
export const Clean: Story = {
  play: async () => {
    await userEvent.click(linkOf());
    await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

/** DIRTY-01: "Sair sem salvar?"; "Continuar editando" stays. */
export const DirtyStay: Story = {
  decorators: [dirtyForm],
  play: async () => {
    await userEvent.click(linkOf());
    const dialog = await screen.findByRole('dialog', {
      name: UNSAVED_CHANGES_TEXT.title,
    });
    await expect(dialog).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: UNSAVED_CHANGES_TEXT.stay }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};

/** DIRTY-01: "Sair" closes the dialog and follows the link. */
export const DirtyLeave: Story = {
  decorators: [dirtyForm],
  play: async () => {
    await userEvent.click(linkOf());
    await userEvent.click(
      await screen.findByRole('button', { name: UNSAVED_CHANGES_TEXT.leave }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};
