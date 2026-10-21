import { render, screen } from '@testing-library/react';
import { STATUS_BADGE_LABELS, StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['open', 'Aberta agora'],
    ['closed', 'Fechada'],
    ['available', 'Disponível'],
    ['unavailable', 'Indisponível'],
  ] as const)('a variante %s mostra o texto "%s"', (variant, text) => {
    render(<StatusBadge variant={variant} />);

    const badge = screen.getByText(text);
    expect(badge).toBeVisible();
    expect(badge.closest('[data-slot="status-badge"]')).toHaveAttribute(
      'data-variant',
      variant,
    );
    expect(STATUS_BADGE_LABELS[variant]).toBe(text);
  });

  it('nunca usa só a cor: cada variante tem ícone decorativo além do texto', () => {
    const { container } = render(<StatusBadge variant="closed" />);

    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Fechada')).toBeInTheDocument();
  });

  it('aberta e disponível usam o par verde; fechada, o par de erro', () => {
    const { container } = render(
      <>
        <StatusBadge variant="open" />
        <StatusBadge variant="available" />
        <StatusBadge variant="closed" />
      </>,
    );
    const [open, available, closed] = [
      ...container.querySelectorAll('[data-slot="status-badge"]'),
    ];

    expect(open!.className).toContain('bg-available-soft');
    expect(open!.className).toContain('text-available-fg');
    expect(available!.className).toContain('bg-available-soft');
    expect(closed!.className).toContain('bg-error-soft');
    expect(closed!.className).toContain('text-error-fg');
  });

  it('indisponível usa o par neutro e aceita classes extras', () => {
    const { container } = render(
      <StatusBadge variant="unavailable" className="extra" />,
    );
    const badge = container.querySelector('[data-slot="status-badge"]')!;

    expect(badge.className).toContain('bg-surface-2');
    expect(badge.className).toContain('extra');
  });
});
