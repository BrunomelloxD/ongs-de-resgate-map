import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('repassa props e aceita digitação', async () => {
    render(<Input aria-label="Nome" type="text" className="extra" />);

    const input = screen.getByRole('textbox', { name: 'Nome' });
    await userEvent.type(input, 'abc');

    expect(input).toHaveValue('abc');
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input.className).toContain('extra');
  });

  it('tem altura mínima de 44 px (A11Y-02) e os 52 px do Design System', () => {
    render(<Input aria-label="Nome" />);

    expect(screen.getByRole('textbox').className).toContain('min-h-13');
  });

  it('é branco, com borda Contorno de 1,5 px, raio de 12 px e texto de 16 px em toda largura', () => {
    render(<Input aria-label="Nome" />);
    const { className } = screen.getByRole('textbox');

    expect(className).toContain('bg-surface');
    expect(className).toContain('border-[1.5px]');
    expect(className).toContain('border-line');
    expect(className).toContain('rounded-field');
    expect(className).toContain('text-base');
    expect(className).not.toContain('md:text-sm');
    expect(className).not.toContain('rounded-lg');
  });

  it('com erro, borda de 2 px Erro e o ícone ⓘ dentro do campo', () => {
    render(<Input aria-label="CNPJ" aria-invalid />);
    const { className } = screen.getByRole('textbox');

    expect(className).toContain('aria-invalid:border-2');
    expect(className).toContain('aria-invalid:border-error');
    expect(className).toContain('aria-invalid:field-invalid-icon');
  });
});
