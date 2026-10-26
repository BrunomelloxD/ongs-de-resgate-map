import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select';

function renderSelect(props: React.ComponentProps<typeof Select> = {}) {
  return render(
    <Select aria-label="UF" defaultValue="" {...props}>
      <option value="">Selecione</option>
      <option value="SP">SP</option>
    </Select>,
  );
}

describe('Select', () => {
  it('é um select nativo que troca o valor', async () => {
    renderSelect({ className: 'extra' });
    const select = screen.getByRole('combobox', { name: 'UF' });

    await userEvent.selectOptions(select, 'SP');

    expect(select).toHaveValue('SP');
    expect(select.className).toContain('extra');
  });

  it('segue o campo do Design System, com o chevron próprio decorativo', () => {
    const { container } = renderSelect();
    const { className } = screen.getByRole('combobox');

    expect(className).toContain('min-h-13');
    expect(className).toContain('appearance-none');
    expect(className).toContain('rounded-field');
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
