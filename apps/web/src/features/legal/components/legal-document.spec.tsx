import { render, screen } from '@testing-library/react';
import { legalDictionary } from '../legal.dictionary';
import { LegalDocument } from './legal-document';

describe('LegalDocument', () => {
  it('mostra título, versão e cada seção', () => {
    render(
      <LegalDocument text={legalDictionary.privacy} version="2026-10-demo" />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de privacidade',
      }),
    ).toBeVisible();
    expect(screen.getByText('Versão 2026-10-demo')).toBeVisible();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(legalDictionary.privacy.sections.map((s) => s.heading));
  });

  it('a política diz que o visitante não recebe cookie (SEC-03)', () => {
    render(
      <LegalDocument text={legalDictionary.privacy} version="2026-10-demo" />,
    );

    expect(
      screen.getByText(
        'Não usamos cookies de analytics nem de terceiros, e quem só visita o site não recebe nenhum cookie.',
      ),
    ).toBeVisible();
  });
});
