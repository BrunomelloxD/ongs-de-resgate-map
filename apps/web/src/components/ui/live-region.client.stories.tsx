import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { LiveRegion, useAnnounce } from './live-region.client';
import { Button } from './button';

function Demo({ message }: { message: string }) {
  const announce = useAnnounce();

  return (
    <Button variant="outline" onClick={() => announce(message)}>
      Anunciar
    </Button>
  );
}

const meta = {
  title: 'UI/LiveRegion',
  component: LiveRegion,
  args: { children: null },
  render: () => (
    <LiveRegion>
      <Demo message="Mel agora está indisponível." />
    </LiveRegion>
  ),
} satisfies Meta<typeof LiveRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('status'),
    ).toBeEmptyDOMElement();
  },
};

export const Announced: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Anunciar' }));
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'Mel agora está indisponível.',
    );
  },
};

export const AnnouncedTwice: Story = {
  play: async ({ canvas, canvasElement }) => {
    const button = canvas.getByRole('button', { name: 'Anunciar' });
    await userEvent.click(button);
    const first = within(canvasElement).getByText(
      'Mel agora está indisponível.',
    );
    await userEvent.click(button);
    await expect(
      within(canvasElement).getByText('Mel agora está indisponível.'),
    ).not.toBe(first);
  },
};
