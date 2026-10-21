import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent } from 'storybook/test';
import { ErrorSummary, FieldError, focusFirstError } from './error-summary';
import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/ErrorSummary',
  component: ErrorSummary,
  args: {
    title: 'Corrija 2 erros para continuar',
    errors: [
      {
        fieldId: 'email',
        message: 'Informe um e-mail válido, como nome@ong.org.',
      },
      {
        fieldId: 'cnpj',
        message: 'O CNPJ tem 14 caracteres. Confira os dígitos.',
      },
    ],
  },
  render: (args) => (
    <form
      aria-label="Cadastro"
      className="flex max-w-md flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        focusFirstError(event.currentTarget);
      }}
    >
      <ErrorSummary {...args} />
      <Label htmlFor="email">E-mail</Label>
      <Input
        id="email"
        aria-invalid={args.errors.length > 0}
        aria-describedby={args.errors.length > 0 ? 'email-error' : undefined}
      />
      {args.errors.length > 0 && (
        <FieldError id="email-error">{args.errors[0]!.message}</FieldError>
      )}
      <Label htmlFor="cnpj">CNPJ</Label>
      <Input id="cnpj" aria-invalid={args.errors.length > 1} />
      <button type="submit">Enviar</button>
    </form>
  ),
} satisfies Meta<typeof ErrorSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithErrors: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar' }));
    await expect(canvas.getByLabelText('E-mail')).toHaveFocus();
  },
};

export const WithoutErrors: Story = { args: { errors: [] } };
