import { render, screen, within } from '@testing-library/react';
import { HowItWorks } from './how-it-works';

describe('HowItWorks', () => {
  it('HOME-01: é a seção "Como funciona" (#como-funciona) com os 3 passos em ordem', () => {
    render(<HowItWorks />);
    const section = screen.getByRole('region', { name: 'Como funciona' });

    expect(section).toHaveAttribute('id', 'como-funciona');
    expect(
      within(section).getByText('Três passos, sem criar conta.'),
    ).toBeVisible();
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Encontre a ONG', 'Conheça os animais', 'Fale com a ONG']);
  });

  it('H-02: cada ícone fica num pino verde-mata, e uma linha pontilhada liga um passo ao seguinte', () => {
    const { container } = render(<HowItWorks />);
    const steps = container.querySelectorAll('[data-slot="how-it-works-step"]');

    expect(steps).toHaveLength(3);
    for (const step of steps) {
      const pin = step.querySelector('[data-slot="pin-photo"]')!;
      expect(pin).toHaveClass('mask-pin', 'bg-brand-deep');
      expect(pin.querySelector('svg')).not.toBeNull();
    }
    // The last step has no path after it.
    expect(
      [...steps].map(
        (step) =>
          step.querySelector('[data-slot="how-it-works-path"]') !== null,
      ),
    ).toEqual([true, true, false]);
    expect(
      steps[2]!.querySelector('[data-slot="whatsapp-icon"]'),
    ).not.toBeNull();
  });
});
