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

  it('HOME-02: nem abrir a página nem tocar no CTA chamam navigator.geolocation', async () => {
    render(<HomeHero />);

    await userEvent.click(
      screen.getByRole('link', { name: 'Encontrar ONGs perto de mim' }),
    );

    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });
  it('PROF-08: mostra o aviso recebido acima do título', () => {
    render(<HomeHero notice={<p role="status">Conta excluída.</p>} />);

    expect(screen.getByRole('status')).toHaveTextContent('Conta excluída.');
  });
});

describe('HomeHero, figcraft 01', () => {
  it('H-01/H-02/H-04: hero com as fotos, "Como funciona" e o bloco para ONGs, nessa ordem', () => {
    const { container } = render(<HomeHero />);
    const art = container.querySelector('[data-slot="hero-art"]')!;
    const title = screen.getByRole('heading', { level: 1 });
    const how = screen.getByRole('region', { name: 'Como funciona' });
    const forNgos = screen.getByRole('region', {
      name: 'Você cuida de animais resgatados?',
    });

    const follows = (a: Node, b: Node) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(follows(art, title)).toBeTruthy();
    expect(follows(title, how)).toBeTruthy();
    expect(follows(how, forNgos)).toBeTruthy();
  });
});
