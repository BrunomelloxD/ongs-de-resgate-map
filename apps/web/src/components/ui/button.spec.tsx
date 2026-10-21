import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from './button';

const sizes = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const;

describe('Button', () => {
  it.each(sizes)('tamanho %s tem altura mínima de 44 px (A11Y-02)', (size) => {
    const classes = buttonVariants({ size });

    expect(classes).toContain('min-h-11');
    expect(classes).not.toMatch(/(^|\s)h-(6|7|8|9)(\s|$)/);
  });

  it.each(['icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const)(
    'tamanho %s tem também largura mínima de 44 px',
    (size) => {
      expect(buttonVariants({ size })).toContain('min-w-11');
    },
  );

  it('renderiza com as variantes padrão', () => {
    render(<Button>Salvar</Button>);

    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button.className).toContain('bg-primary');
  });

  it('aplica variante, tamanho e classes extras', () => {
    render(
      <Button variant="destructive" size="sm" className="extra">
        Excluir
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Excluir' });
    expect(button.className).toContain('text-destructive');
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('extra');
  });

  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ok</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Ok' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('buttonVariants gera as classes para outros elementos (ex.: links)', () => {
    expect(buttonVariants({ variant: 'outline' })).toContain('border-border');
  });
});
