import { render, screen } from '@testing-library/react';
import { Stepper } from './stepper';

describe('Stepper', () => {
  it('step=3, label="Endereço" mostra "Etapa 3 de 5" e o nome da etapa', () => {
    render(<Stepper step={3} label="Endereço" />);

    expect(screen.getByText('Etapa 3 de 5')).toBeVisible();
    expect(screen.getByText('Endereço')).toBeVisible();
  });

  it('a barra de progresso expõe o valor e é nomeada pelo texto da etapa', () => {
    render(<Stepper step={3} label="Endereço" />);

    const bar = screen.getByRole('progressbar', { name: 'Etapa 3 de 5' });
    expect(bar).toHaveAttribute('aria-valuemin', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuetext', 'Etapa 3 de 5: Endereço');
  });

  it('marca as etapas concluídas, a atual e as próximas', () => {
    const { container } = render(<Stepper step={3} label="Endereço" />);

    const states = [...container.querySelectorAll('[data-state]')].map((el) =>
      el.getAttribute('data-state'),
    );
    expect(states).toEqual([
      'complete',
      'complete',
      'current',
      'upcoming',
      'upcoming',
    ]);
  });

  it.each([1, 5])('aceita a etapa %i', (step) => {
    render(<Stepper step={step} label="Nome" />);

    expect(screen.getByText(`Etapa ${step} de 5`)).toBeInTheDocument();
  });

  it('aceita classes extras', () => {
    const { container } = render(
      <Stepper step={1} label="Sobre a ONG" className="extra" />,
    );

    expect(container.firstElementChild!.className).toContain('extra');
  });
});
