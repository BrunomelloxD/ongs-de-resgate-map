import { render, screen, within } from '@testing-library/react';
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

  it('T196: tem a navbar e o conteúdo no #conteudo do "Pular para o conteúdo"', () => {
    render(<TermsPage />);

    expect(
      // The document has a <header> of its own inside <main>.
      within(
        document.querySelector<HTMLElement>('[data-slot="navbar"]')!,
      ).getByRole('link', {
        name: 'Animal Helper',
      }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });
});
