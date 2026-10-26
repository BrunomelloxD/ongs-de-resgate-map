import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Option } from './option';

function Group() {
  return (
    <fieldset>
      <legend>Espécie</legend>
      <Option name="species" value="DOG" defaultChecked>
        Cão
      </Option>
      <Option name="species" value="CAT" className="extra">
        Gato
      </Option>
    </fieldset>
  );
}

describe('Option', () => {
  it('é um radio com o texto como nome acessível; o clique marca', async () => {
    render(<Group />);

    expect(screen.getByRole('radio', { name: 'Cão' })).toBeChecked();
    await userEvent.click(screen.getByText('Gato'));
    expect(screen.getByRole('radio', { name: 'Gato' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Cão' })).not.toBeChecked();
  });

  it('as setas do teclado trocam a opção', async () => {
    render(<Group />);

    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Cão' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Gato' })).toBeChecked();
  });

  it('é um retângulo de raio 12 com 52 px, verde-mata quando marcado', () => {
    render(<Group />);
    const label = screen.getByText('Gato').closest('label')!;

    expect(label.className).toContain('rounded-field');
    expect(label.className).toContain('min-h-13');
    expect(label.className).toContain('has-checked:bg-brand-deep');
    expect(label.className).not.toContain('rounded-full');
    expect(label.className).toContain('extra');
  });
});
