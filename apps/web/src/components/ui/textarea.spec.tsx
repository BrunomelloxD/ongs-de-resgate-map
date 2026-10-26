import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('aceita digitação e repassa props', async () => {
    render(<Textarea aria-label="Descrição" className="extra" />);
    const field = screen.getByRole('textbox', { name: 'Descrição' });

    await userEvent.type(field, 'Resgatamos cães');

    expect(field).toHaveValue('Resgatamos cães');
    expect(field).toHaveAttribute('data-slot', 'textarea');
    expect(field.className).toContain('extra');
  });

  it('segue o campo do Design System, com 120 px e sem a alça de redimensionar', () => {
    render(<Textarea aria-label="Descrição" />);
    const { className } = screen.getByRole('textbox');

    expect(className).toContain('rounded-field');
    expect(className).toContain('bg-surface');
    expect(className).toContain('border-line');
    expect(className).toContain('min-h-30');
    expect(className).toContain('resize-none');
    expect(className).not.toContain('rounded-lg');
  });
});
