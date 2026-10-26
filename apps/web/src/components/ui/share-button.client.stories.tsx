import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { LiveRegion } from './live-region.client';
import { ShareButton } from './share-button.client';
import { SHARE_TEXT } from './ui.dictionary';

const URL_ = 'https://animalhelper.example/ong/patas-do-bairro';
const share = fn(async () => undefined);

/** Swaps a navigator API for the story and puts the real one back after. */
function stub(name: 'share' | 'clipboard', value: unknown) {
  const own = Object.getOwnPropertyDescriptor(navigator, name);
  Object.defineProperty(navigator, name, { value, configurable: true });
  return () => {
    if (own) Object.defineProperty(navigator, name, own);
    else delete (navigator as unknown as Record<string, unknown>)[name];
  };
}

const meta = {
  title: 'UI/ShareButton',
  component: ShareButton,
  args: {
    title: 'Patas do Bairro',
    text: 'Resgatamos cães e gatos na Zona Sul.',
    url: URL_,
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <Story />
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof ShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SHARE-01: the browser has the native share sheet. */
export const WebShare: Story = {
  beforeEach: () => stub('share', share),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: SHARE_TEXT.label }),
    );
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Patas do Bairro',
        text: 'Resgatamos cães e gatos na Zona Sul.',
        url: URL_,
      }),
    );
  },
};

/** SHARE-02: no Web Share, the URL is copied. */
export const Copied: Story = {
  beforeEach: () => {
    const restoreShare = stub('share', undefined);
    const restoreClipboard = stub('clipboard', {
      writeText: async () => undefined,
    });
    return () => {
      restoreShare();
      restoreClipboard();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: SHARE_TEXT.label }),
    );
    await expect(
      await canvas.findByText(SHARE_TEXT.copied, {
        ignore: '[role=status] *',
      }),
    ).toBeVisible();
  },
};

/** SHARE-03: the copy fails, so the URL shows up selected in a field. */
export const CopyFailed: Story = {
  beforeEach: () => {
    const restoreShare = stub('share', undefined);
    const restoreClipboard = stub('clipboard', {
      writeText: async () => {
        throw new DOMException('negado', 'NotAllowedError');
      },
    });
    return () => {
      restoreShare();
      restoreClipboard();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: SHARE_TEXT.label }),
    );
    const field = await canvas.findByRole('textbox', {
      name: SHARE_TEXT.field,
    });
    await expect(field).toHaveValue(URL_);
    await waitFor(() => expect(field).toHaveFocus());
  },
};

/** C-25: the round button floating over a photo; "Link copiado." floats below it. */
export const Icon: Story = {
  args: { variant: 'icon' },
  decorators: [
    (Story) => (
      <div className="flex h-40 justify-end bg-brand-deep p-4">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const restore = [
      stub('share', undefined),
      stub('clipboard', { writeText: fn(async () => undefined) }),
    ];
    try {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Compartilhar' }),
      );
      await waitFor(() =>
        expect(canvas.getAllByText(SHARE_TEXT.copied).length).toBeGreaterThan(
          0,
        ),
      );
    } finally {
      restore.forEach((undo) => undo());
    }
  },
};
