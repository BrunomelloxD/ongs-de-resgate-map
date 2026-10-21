import { render, screen } from '@testing-library/react';
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
});
