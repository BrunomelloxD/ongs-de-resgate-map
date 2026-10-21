import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { legalDictionary } from '../legal.dictionary';
import { TERMS_VERSION } from '../terms-version';
import { LegalDocument } from './legal-document';

const meta = {
  title: 'Legal/LegalDocument',
  component: LegalDocument,
  args: { text: legalDictionary.terms, version: TERMS_VERSION },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LegalDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Terms: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Versão 2026-10-demo')).toBeVisible();
  },
};

export const Privacy: Story = { args: { text: legalDictionary.privacy } };
