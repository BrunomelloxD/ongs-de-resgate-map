import { render, screen } from '@testing-library/react';
import { Alert } from './alert';

describe('Alert', () => {
  it.each([
    ['info', 'bg-gem-soft', 'text-gem-soft-fg'],
    ['error', 'bg-error-soft', 'text-error-fg'],
    ['success', 'bg-available-soft', 'text-available-fg'],
  ] as const)(
    '%s: fundo %s, título em negrito %s e o texto de apoio',
    (variant, box, title) => {
      const { container } = render(
        <Alert variant={variant} title="Título do aviso">
          Texto de apoio do aviso.
        </Alert>,
      );
      const alert = container.firstElementChild!;

      expect(alert).toHaveAttribute('data-variant', variant);
      expect(alert.className).toContain(box);
      expect(screen.getByText('Título do aviso')).toHaveClass(
        'font-bold',
        title,
      );
      expect(screen.getByText('Texto de apoio do aviso.')).toBeVisible();
      expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it('sem texto de apoio, mostra só o título; repassa role e classes', () => {
    render(
      <Alert
        variant="error"
        title="Arraste o pino até o local"
        role="status"
        className="extra"
      />,
    );

    const alert = screen.getByRole('status');
    expect(alert).toHaveTextContent('Arraste o pino até o local');
    expect(alert.className).toContain('extra');
    expect(alert.querySelectorAll('p')).toHaveLength(1);
  });
});
