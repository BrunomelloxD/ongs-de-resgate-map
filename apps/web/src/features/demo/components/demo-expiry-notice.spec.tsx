import { render, screen } from '@testing-library/react';
import { DemoExpiryNotice } from './demo-expiry-notice';

const NOW = new Date('2026-10-21T12:00:00-03:00');

describe('DemoExpiryNotice', () => {
  it('DEMO-06: expiresAt daqui a 6 dias e 1 h → "faltam 7 dias" com a data certa', () => {
    render(
      <DemoExpiryNotice expiresAt="2026-10-27T13:00:00-03:00" now={NOW} />,
    );

    expect(
      screen.getByText(
        'Seus dados serão apagados em 27/10/2026 — faltam 7 dias',
      ),
    ).toBeInTheDocument();
  });

  it('DEMO-06: exatamente 1 dia → "falta 1 dia"', () => {
    render(
      <DemoExpiryNotice expiresAt="2026-10-22T12:00:00-03:00" now={NOW} />,
    );

    expect(
      screen.getByText('Seus dados serão apagados em 22/10/2026 — falta 1 dia'),
    ).toBeInTheDocument();
  });

  it('DEMO-20: expiresAt nulo (demo desligada) → não renderiza', () => {
    const { container } = render(
      <DemoExpiryNotice expiresAt={null} now={NOW} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
