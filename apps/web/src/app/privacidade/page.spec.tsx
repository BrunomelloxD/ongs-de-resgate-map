import { render, screen, within } from '@testing-library/react';
import PrivacyPage, { metadata } from './page';

describe('/privacidade', () => {
  it('renderiza o título e a versão dos termos', () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de privacidade',
      }),
    ).toBeVisible();
    expect(screen.getByText('Versão 2026-10-demo')).toBeVisible();
    expect(metadata.title).toBe('Política de privacidade');
  });

  it('T196: tem a navbar e o conteúdo no #conteudo do "Pular para o conteúdo"', () => {
    render(<PrivacyPage />);

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
