import { render, screen } from '@testing-library/react';
import { DemoAccountCard } from './demo-account-card';

describe('DemoAccountCard', () => {
  it('exibe o e-mail e a senha da conta demo (DEP-18)', () => {
    render(
      <DemoAccountCard email="demo@animalhelper.example" password="Demo1234" />,
    );

    expect(screen.getByText('Conta de demonstração')).toBeInTheDocument();
    expect(screen.getByText('E-mail').nextElementSibling).toHaveTextContent(
      'demo@animalhelper.example',
    );
    expect(screen.getByText('Senha').nextElementSibling).toHaveTextContent(
      'Demo1234',
    );
  });
});
