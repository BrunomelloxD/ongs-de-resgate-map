import { render, screen } from '@testing-library/react';
import { PasswordRules } from './password-rules';

const items = () => screen.getAllByRole('listitem').map((li) => li.textContent);

describe('PasswordRules', () => {
  it('SIGN-15: senha vazia mostra as 3 regras como não atendidas', () => {
    render(<PasswordRules password="" />);

    expect(screen.getByText('A senha precisa ter:')).toBeInTheDocument();
    expect(items()).toEqual([
      '8 ou mais caracteres(não atendida)',
      'Ao menos uma letra(não atendida)',
      'Ao menos um número(não atendida)',
    ]);
  });

  it('SIGN-15: marca cada regra atendida', () => {
    render(<PasswordRules password="abc1" />);

    expect(items()).toEqual([
      '8 ou mais caracteres(não atendida)',
      'Ao menos uma letra(atendida)',
      'Ao menos um número(atendida)',
    ]);
  });

  it('aceita textos e id próprios', () => {
    render(
      <PasswordRules
        id="regras"
        password="senha1234"
        title="Regras"
        metLabel="ok"
        unmetLabel="falta"
      />,
    );

    expect(screen.getByText('Regras').parentElement).toHaveAttribute(
      'id',
      'regras',
    );
    expect(items()).toEqual([
      '8 ou mais caracteres(ok)',
      'Ao menos uma letra(ok)',
      'Ao menos um número(ok)',
    ]);
  });
});
