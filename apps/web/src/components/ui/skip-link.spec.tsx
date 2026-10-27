import { render, screen } from '@testing-library/react';
import { SkipLink } from './skip-link';

describe('SkipLink', () => {
  it('"Pular para o conteúdo" leva ao #conteudo e só aparece com o foco', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Pular para o conteúdo' });

    expect(link).toHaveAttribute('href', '#conteudo');
    expect(link.className).toContain('-translate-y-[200%]');
    expect(link.className).toContain('focus:translate-y-0');
    expect(link.className).toContain('touch-target');
  });
});
