import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('é escondido de leitores de tela (aria-hidden="true")', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toBeEmptyDOMElement();
  });

  it('anima, mas desliga a animação com prefers-reduced-motion', () => {
    const { container } = render(<Skeleton />);
    const { className } = container.firstElementChild!;

    expect(className).toContain('animate-pulse');
    expect(className).toContain('motion-reduce:animate-none');
  });

  it('usa o tom de skeleton e aceita classes extras para o formato', () => {
    const { container } = render(<Skeleton className="h-4 w-40" />);
    const { className } = container.firstElementChild!;

    expect(className).toContain('bg-surface-2');
    expect(className).toContain('h-4');
    expect(className).toContain('w-40');
  });

  it('repassa atributos do div', () => {
    const { container } = render(<Skeleton data-testid="s" />);

    expect(container.firstElementChild).toHaveAttribute('data-testid', 's');
  });
});
