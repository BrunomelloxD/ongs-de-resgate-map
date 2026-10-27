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

    expect(classes).toMatch(/(^|\s)min-h-1[13](\s|$)/);
    expect(classes).not.toMatch(/(^|\s)h-(6|7|8|9)(\s|$)/);
  });

  it.each(['default', 'lg'] as const)(
    'tamanho %s tem os 52 px do Design System',
    (size) => {
      expect(buttonVariants({ size })).toContain('min-h-13');
    },
  );

  it.each(['sm', 'xs'] as const)('tamanho %s tem 44 px', (size) => {
    expect(buttonVariants({ size })).toContain('min-h-11');
  });

  it.each(['icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const)(
    'tamanho %s tem também largura mínima de 44 px',
    (size) => {
      expect(buttonVariants({ size })).toMatch(/(^|\s)min-w-1[13](\s|$)/);
    },
  );

  it('é uma pílula em todas as variantes, sem o rounded-lg do shadcn', () => {
    for (const variant of [
      'default',
      'outline',
      'secondary',
      'ghost',
      'destructive',
      'link',
      'whatsapp',
    ] as const) {
      const classes = buttonVariants({ variant });
      expect(classes).toContain('rounded-full');
      expect(classes).not.toContain('rounded-lg');
    }
  });

  it('renderiza com as variantes padrão (primário amarelo, texto Tinta)', () => {
    render(<Button>Salvar</Button>);

    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button.className).toContain('bg-brand');
    expect(button.className).toContain('text-on-brand');
    expect(button.className).toContain('font-bold');
  });

  it('aplica variante, tamanho e classes extras', () => {
    render(
      <Button variant="destructive" size="sm" className="extra">
        Excluir
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Excluir' });
    expect(button.className).toContain('bg-danger');
    expect(button.className).toContain('text-on-danger');
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('extra');
  });

  it('secundário é verde-mata com texto branco', () => {
    const classes = buttonVariants({ variant: 'secondary' });

    expect(classes).toContain('bg-brand-deep');
    expect(classes).toContain('text-on-brand-deep');
  });

  it('C-24: WhatsApp é o verde do WhatsApp com texto branco', () => {
    render(<Button variant="whatsapp">Falar no WhatsApp</Button>);

    expect(screen.getByRole('button')).toHaveClass(
      'bg-whatsapp',
      'text-on-whatsapp',
    );
  });

  it('desabilitado usa Superfície 2 e texto cinza, sem opacidade', () => {
    render(<Button disabled>Criar conta</Button>);

    const button = screen.getByRole('button', { name: 'Criar conta' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:bg-surface-2');
    expect(button.className).toContain('disabled:text-fg-disabled');
    expect(button.className).not.toContain('opacity-50');
  });

  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ok</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Ok' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('buttonVariants gera as classes para outros elementos (ex.: links)', () => {
    const classes = buttonVariants({ variant: 'outline' });

    expect(classes).toContain('border-fg');
    expect(classes).toContain('border-[1.5px]');
    // Without cn() merging a link must not get a competing border colour.
    expect(classes).not.toMatch(/(^|\s)border-transparent(\s|$)/);
  });
});
