import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Stepper } from './stepper';

const meta = {
  title: 'UI/Stepper',
  component: Stepper,
  args: { step: 1, label: 'Sobre a ONG' },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Step1: Story = {};
export const Step2: Story = { args: { step: 2, label: 'Contato e acesso' } };
export const Step3: Story = { args: { step: 3, label: 'Endereço' } };
export const Step4: Story = {
  args: { step: 4, label: 'Horário de funcionamento' },
};
export const Step5: Story = { args: { step: 5, label: 'Revisão' } };
