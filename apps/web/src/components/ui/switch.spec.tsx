import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch';

const LABEL = 'Disponível para adoção: Mel';

describe('Switch', () => {
  it('tem role="switch", o aria-label recebido e começa desligado', () => {
    render(<Switch aria-label={LABEL} />);

    expect(screen.getByRole('switch', { name: LABEL })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('o clique alterna aria-checked e avisa onCheckedChange', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label={LABEL} onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', { name: LABEL });

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('Espaço e Enter alternam, com foco por Tab', async () => {
    render(<Switch aria-label={LABEL} />);
    const toggle = screen.getByRole('switch', { name: LABEL });

    await userEvent.tab();
    expect(toggle).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('modo controlado: aria-checked segue a prop', () => {
    const { rerender } = render(<Switch aria-label={LABEL} checked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');

    rerender(<Switch aria-label={LABEL} checked={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('defaultChecked começa ligado', () => {
    render(<Switch aria-label={LABEL} defaultChecked />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('desabilitado não alterna', async () => {
    render(<Switch aria-label={LABEL} disabled />);
    const toggle = screen.getByRole('switch');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('trilho do Design System: cinza desligado, verde ligado, bolinha branca', () => {
    const { container } = render(<Switch aria-label={LABEL} />);
    const track = container.querySelector('[data-slot="switch"] > span')!;

    expect(track.className).toContain('bg-switch-off');
    expect(track.className).toContain(
      'group-data-[checked]/switch:bg-available',
    );
    expect(track.firstElementChild!.className).toContain('bg-white');
  });

  it('o alvo de toque tem 44px', () => {
    render(<Switch aria-label={LABEL} className="extra" />);
    const toggle = screen.getByRole('switch');

    expect(toggle.className).toContain('min-h-11');
    expect(toggle.className).toContain('min-w-11');
    expect(toggle.className).toContain('extra');
  });
});
