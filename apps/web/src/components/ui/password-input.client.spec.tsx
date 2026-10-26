import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Label } from './label';
import { PasswordInput } from './password-input.client';

function renderField(props: React.ComponentProps<typeof PasswordInput> = {}) {
  return render(
    <>
      <Label htmlFor="senha">Senha</Label>
      <PasswordInput id="senha" {...props} />
    </>,
  );
}

describe('PasswordInput', () => {
  it('começa escondendo a senha, com o botão de olho desligado', () => {
    renderField();

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    const eye = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(eye).toHaveAttribute('aria-controls', 'senha');
    expect(eye).toHaveAttribute('type', 'button');
  });

  it('o olho mostra e esconde a senha digitada', async () => {
    renderField();
    const field = screen.getByLabelText('Senha');
    await userEvent.type(field, 'patas2026');
    const eye = screen.getByRole('button', { name: 'Mostrar senha' });

    await userEvent.click(eye);
    expect(field).toHaveAttribute('type', 'text');
    expect(field).toHaveValue('patas2026');
    expect(eye).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(eye);
    expect(field).toHaveAttribute('type', 'password');
    expect(eye).toHaveAttribute('aria-pressed', 'false');
  });

  it('o botão tem alvo de 44 px (A11Y-02) e o campo repassa as props', () => {
    renderField({ className: 'extra', 'aria-invalid': true });

    expect(
      screen.getByRole('button', { name: 'Mostrar senha' }).className,
    ).toContain('size-11');
    const field = screen.getByLabelText('Senha');
    expect(field.className).toContain('extra');
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });
});
