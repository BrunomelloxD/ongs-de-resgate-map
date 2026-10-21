import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeHero } from './home-hero';

const geolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: geolocation,
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomeHero', () => {
  it('HOME-01: mostra a proposta e o "como funciona" em 3 passos', () => {
    render(<HomeHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Adote perto de casa.' }),
    ).toBeVisible();
    const how = screen.getByRole('region', { name: 'Como funciona' });
    const steps = within(how).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(
      steps.map((step) => within(step).getByRole('heading').textContent),
    ).toEqual(['Encontre a ONG', 'Conheça os animais', 'Fale com a ONG']);
  });

  it('HOME-02: o CTA "Encontrar ONGs perto de mim" leva a /localizacao', () => {
    render(<HomeHero />);

    expect(
      screen.getByRole('link', { name: 'Encontrar ONGs perto de mim' }),
    ).toHaveAttribute('href', '/localizacao');
  });

  it('HOME-03: o link "Sou uma ONG" leva a /entrar', () => {
    render(<HomeHero />);

    expect(screen.getByRole('link', { name: 'Sou uma ONG' })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });

  it('mantém o botão de tema com os dois rótulos', () => {
    render(<HomeHero />);

    const toggle = screen.getByRole('button', { name: /Usar tema escuro/ });
    expect(toggle).toHaveTextContent('Usar tema escuro');
    expect(toggle).toHaveTextContent('Usar tema claro');
  });

  it('HOME-02: nem abrir a página nem tocar no CTA chamam navigator.geolocation', async () => {
    render(<HomeHero />);

    await userEvent.click(
      screen.getByRole('link', { name: 'Encontrar ONGs perto de mim' }),
    );

    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });
});
