import { render, screen } from '@testing-library/react';
import TermsPage, { metadata } from './page';

describe('/termos', () => {
  it('renderiza o título e a versão dos termos', () => {
    render(<TermsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Termos de uso' }),
    ).toBeVisible();
    expect(screen.getByText('Versão 2026-10-demo')).toBeVisible();
    expect(metadata.title).toBe('Termos de uso');
  });
});
