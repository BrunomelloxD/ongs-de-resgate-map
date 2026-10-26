import { render, screen, within } from '@testing-library/react';
import { AuthShell } from './auth-shell';

const PHOTO = { src: '/photos/login-puppy.webp', width: 600, height: 780 };
const PHRASE =
  'Cada animal que você cadastra aparece no mapa para quem quer adotar perto de casa.';

const panel = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="auth-shell-panel"]')!;

describe('AuthShell', () => {
  it('login: painel verde de 680 px só a partir de 1024 px, com logo, foto em pino e frase', () => {
    const { container } = render(
      <AuthShell variant="login" photo={PHOTO} phrase={PHRASE}>
        <h1>Entrar na área da ONG</h1>
      </AuthShell>,
    );
    const aside = panel(container);

    expect(aside.className).toContain('hidden');
    expect(aside.className).toContain('lg:flex');
    expect(aside.className).toContain('lg:w-[680px]');
    expect(aside.className).toContain('bg-brand-deep');
    expect(within(aside).getByText('Animal Helper')).toBeInTheDocument();
    expect(within(aside).getByText(PHRASE)).toBeInTheDocument();
    expect(aside.querySelector('[data-slot="pin-photo"]')).toHaveStyle({
      width: '300px',
      height: '390px',
    });
  });

  it('a foto é ilustração (alt vazio), WebP com width e height (PERF-02)', () => {
    const { container } = render(
      <AuthShell variant="login" photo={PHOTO} phrase={PHRASE}>
        <p>form</p>
      </AuthShell>,
    );
    const img = panel(container).querySelector('img')!;

    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('src', '/photos/login-puppy.webp');
    expect(img).toHaveAttribute('width', '600');
    expect(img).toHaveAttribute('height', '780');
  });

  it('o formulário fica no main, numa coluna de 420 px no desktop', () => {
    render(
      <AuthShell variant="login" photo={PHOTO} phrase={PHRASE}>
        <h1>Entrar na área da ONG</h1>
      </AuthShell>,
    );
    const main = screen.getByRole('main');

    expect(within(main).getByRole('heading')).toHaveTextContent(
      'Entrar na área da ONG',
    );
    expect(main.firstElementChild!.className).toContain('lg:max-w-[420px]');
    expect(main.firstElementChild!.className).toContain('max-w-md');
  });

  it('cadastro: painel de 440 px com título, texto, foto de 200×260 e o rodapé; coluna de 560 px', () => {
    const { container } = render(
      <AuthShell
        variant="signup"
        photo={{ src: '/photos/signup-cat.webp', width: 400, height: 520 }}
        title="Cadastre sua ONG"
        text="Leva uns 5 minutos."
        footer={<a href="/entrar">Entrar</a>}
      >
        <p>etapa</p>
      </AuthShell>,
    );
    const aside = panel(container);

    expect(aside.className).toContain('lg:w-[440px]');
    expect(within(aside).getByText('Cadastre sua ONG')).toBeInTheDocument();
    expect(within(aside).getByText('Leva uns 5 minutos.')).toBeInTheDocument();
    expect(within(aside).getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar',
    );
    expect(aside.querySelector('[data-slot="pin-photo"]')).toHaveStyle({
      width: '200px',
      height: '260px',
    });
    expect(screen.getByRole('main').firstElementChild!.className).toContain(
      'lg:max-w-[560px]',
    );
  });
});
