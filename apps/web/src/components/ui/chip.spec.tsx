import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip, ChipGroup } from './chip';

describe('Chip', () => {
  it('começa desligado e o clique alterna aria-pressed', async () => {
    render(<Chip>Cachorros</Chip>);
    const chip = screen.getByRole('button', { name: 'Cachorros' });

    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('recebe foco por teclado e Espaço e Enter alternam', async () => {
    render(<Chip>Gatos</Chip>);
    const chip = screen.getByRole('button', { name: 'Gatos' });

    await userEvent.tab();
    expect(chip).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{Enter}');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('defaultPressed começa ligado e onPressedChange recebe o novo valor', async () => {
    const onPressedChange = vi.fn();
    render(
      <Chip defaultPressed onPressedChange={onPressedChange}>
        Porte pequeno
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Porte pequeno' });

    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(onPressedChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('no modo controlado, aria-pressed segue a prop', () => {
    const { rerender } = render(<Chip pressed>Todos</Chip>);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    rerender(<Chip pressed={false}>Todos</Chip>);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('desabilitado não alterna e tem alvo mínimo de 44px', async () => {
    render(<Chip disabled>Filhotes</Chip>);
    const chip = screen.getByRole('button', { name: 'Filhotes' });

    await userEvent.click(chip);
    expect(chip).toBeDisabled();
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip.className).toContain('touch-target');
  });
});

describe('ChipGroup', () => {
  it('agrupa os chips sob um rótulo visível', () => {
    render(
      <ChipGroup label="Espécie">
        <Chip>Cães</Chip>
        <Chip>Gatos</Chip>
      </ChipGroup>,
    );

    const group = screen.getByRole('group', { name: 'Espécie' });
    expect(screen.getByText('Espécie')).toBeVisible();
    expect(group).toContainElement(
      screen.getByRole('button', { name: 'Cães' }),
    );
    expect(group).toContainElement(
      screen.getByRole('button', { name: 'Gatos' }),
    );
  });

  it('dois grupos têm rótulos independentes', () => {
    render(
      <>
        <ChipGroup label="Espécie">
          <Chip>Cães</Chip>
        </ChipGroup>
        <ChipGroup label="Porte" className="extra">
          <Chip>Pequeno</Chip>
        </ChipGroup>
      </>,
    );

    expect(screen.getByRole('group', { name: 'Espécie' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Porte' }).parentElement!.className,
    ).toContain('extra');
  });
});
