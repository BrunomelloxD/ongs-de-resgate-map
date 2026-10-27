import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  fetchSessionStatus,
  Navbar,
  type SessionStatus,
} from './navbar.client';

const VISITOR = async (): Promise<SessionStatus> => ({ loggedIn: false });
const LOGGED = async (): Promise<SessionStatus> => ({
  loggedIn: true,
  name: 'Patas do Bairro',
  avatarUrl: '/img/ngos/1/logo/abc-160.webp',
});

function renderNavbar(props: Partial<Parameters<typeof Navbar>[0]> = {}) {
  const logoutAction = vi.fn(async () => {});
  const view = render(
    <Navbar logoutAction={logoutAction} fetchStatus={VISITOR} {...props} />,
  );
  return { ...view, logoutAction };
}

const banner = () => screen.getByRole('banner');
const openMenu = () => screen.getByRole('button', { name: 'Abrir menu' });

afterEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

describe('Navbar', () => {
  // Migrated from site-header.spec.tsx and map-column-header.spec.tsx (T196).
  it('desktop: logo para a home, os três links e "Entrar" + "Cadastrar minha ONG" com os href da nota', async () => {
    renderNavbar();
    const header = banner();

    expect(
      within(header).getByRole('link', { name: 'Animal Helper' }),
    ).toHaveAttribute('href', '/');
    const nav = within(header).getByRole('navigation', { name: 'Principal' });
    expect(
      within(nav).getByRole('link', { name: 'Mapa de ONGs' }),
    ).toHaveAttribute('href', '/localizacao');
    expect(
      within(nav).getByRole('link', { name: 'Como funciona' }),
    ).toHaveAttribute('href', '/#como-funciona');
    expect(
      within(nav).getByRole('link', { name: 'Para ONGs' }),
    ).toHaveAttribute('href', '/#para-ongs');
    // HOME-03: the NGO login (was "Sou uma ONG").
    const login = within(header).getByRole('link', { name: 'Entrar' });
    expect(login).toHaveAttribute('href', '/entrar');
    expect(login.className).toContain('border-fg');
    expect(
      within(header).getByRole('link', { name: 'Cadastrar minha ONG' }),
    ).toHaveAttribute('href', '/cadastro/sobre');
    await waitFor(() => expect(login).toBeInTheDocument());
  });

  it('no celular os links e os botões saem da barra; ficam o logo e o ≡', () => {
    renderNavbar();

    expect(
      screen.getByRole('navigation', { name: 'Principal' }).className,
    ).toContain('hidden lg:block');
    for (const name of ['Entrar', 'Cadastrar minha ONG']) {
      expect(screen.getByRole('link', { name }).className).toContain(
        'max-lg:hidden',
      );
    }
    expect(openMenu().className).toContain('lg:hidden');
    expect(openMenu().className).toContain('touch-target');
  });

  it('alvos de toque: links de 48 px, botões de 52 px, logo e ≡ com 44 px (A11Y-02)', () => {
    renderNavbar();
    const nav = screen.getByRole('navigation', { name: 'Principal' });

    for (const link of within(nav).getAllByRole('link')) {
      expect(link.className).toContain('h-12');
    }
    for (const name of ['Entrar', 'Cadastrar minha ONG']) {
      expect(screen.getByRole('link', { name }).className).toContain(
        'min-h-13',
      );
    }
    expect(
      screen.getByRole('link', { name: 'Animal Helper' }).className,
    ).toContain('touch-target');
  });

  // Migrated from site-header.spec.tsx ("desktopOnly ... extra"): the navbar shows on every screen now.
  it('aceita className extra e aparece em todas as larguras', () => {
    renderNavbar({ className: 'extra' });

    expect(banner().className).toContain('extra');
    expect(banner().className).not.toContain('max-lg:hidden');
  });

  it('current="map" marca só "Mapa de ONGs" com aria-current="page"', () => {
    renderNavbar({ current: 'map' });
    const nav = screen.getByRole('navigation', { name: 'Principal' });

    const map = within(nav).getByRole('link', { name: 'Mapa de ONGs' });
    expect(map).toHaveAttribute('aria-current', 'page');
    expect(map.className).toContain('bg-brand-soft');
    for (const name of ['Como funciona', 'Para ONGs']) {
      expect(within(nav).getByRole('link', { name })).not.toHaveAttribute(
        'aria-current',
      );
    }
  });

  it('sem current, nenhum link fica ativo', () => {
    renderNavbar();

    for (const link of within(
      screen.getByRole('navigation', { name: 'Principal' }),
    ).getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('logada: "Área da ONG" com o nome e o avatar em pino troca os botões, com link para /painel', async () => {
    renderNavbar({ fetchStatus: LOGGED });

    const area = await screen.findByRole('link', {
      name: 'Área da ONG Patas do Bairro',
    });
    expect(area).toHaveAttribute('href', '/painel');
    expect(area.querySelector('[data-slot="pin-photo"] img')).toHaveAttribute(
      'src',
      '/img/ngos/1/logo/abc-160.webp',
    );
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar minha ONG' }),
    ).toBeNull();
  });

  it('logada sem imagem: o pino mostra a pata', async () => {
    renderNavbar({
      fetchStatus: async () => ({ loggedIn: true, name: 'Gatil Sete Vidas' }),
    });

    const area = await screen.findByRole('link', {
      name: 'Área da ONG Gatil Sete Vidas',
    });
    expect(area.querySelector('img')).toBeNull();
    expect(area.querySelector('svg')).not.toBeNull();
  });

  it('enquanto o estado não chega, mostra o visitante; desmontada antes da resposta, não atualiza', async () => {
    let resolve!: (status: SessionStatus) => void;
    const pending = new Promise<SessionStatus>((r) => (resolve = r));
    const { unmount } = renderNavbar({ fetchStatus: () => pending });

    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    unmount();
    await act(async () => resolve({ loggedIn: true, name: 'Patas do Bairro' }));
    expect(screen.queryByRole('banner')).toBeNull();
  });

  describe('rolagem', () => {
    it('no topo, sem fundo nem sombra; depois de rolar, fundo, sombra e linha de 1 px', () => {
      renderNavbar();
      const header = banner();

      expect(header).toHaveAttribute('data-raised', 'false');
      expect(header.className).toContain('bg-transparent');
      expect(header.className).toContain('sticky');
      expect(header.className).toContain('top-0');

      act(() => {
        Object.defineProperty(window, 'scrollY', {
          value: 120,
          configurable: true,
        });
        window.dispatchEvent(new Event('scroll'));
      });
      expect(header).toHaveAttribute('data-raised', 'true');
      expect(header.className).toContain('bg-nav');
      expect(header.className).toContain('shadow-nav');
      expect(header.className).toContain('border-fg/8');

      act(() => {
        Object.defineProperty(window, 'scrollY', {
          value: 0,
          configurable: true,
        });
        window.dispatchEvent(new Event('scroll'));
      });
      expect(header).toHaveAttribute('data-raised', 'false');
    });

    it('solid (mapa): sempre no estado "Rolada", mesmo no topo', () => {
      renderNavbar({ solid: true });

      expect(banner()).toHaveAttribute('data-raised', 'true');
    });

    it('para de ouvir a rolagem ao desmontar', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderNavbar();

      unmount();

      expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });

  describe('menu do celular', () => {
    it('≡ tem aria-expanded e abre o diálogo modal com os links, os botões e o rodapé', async () => {
      renderNavbar({ current: 'map' });
      const trigger = openMenu();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const dialog = screen.getByRole('dialog', { name: 'Menu' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      const map = within(dialog).getByRole('link', { name: 'Mapa de ONGs' });
      expect(map).toHaveAttribute('aria-current', 'page');
      expect(map).toHaveAttribute('href', '/localizacao');
      expect(map.className).toContain('bg-brand');
      expect(map.className).toContain('min-h-14');
      expect(
        within(dialog).getByRole('link', { name: 'Como funciona' }),
      ).toHaveAttribute('href', '/#como-funciona');
      expect(
        within(dialog).getByRole('link', { name: 'Para ONGs' }),
      ).toHaveAttribute('href', '/#para-ongs');
      expect(
        within(dialog).getByRole('link', { name: 'Cadastrar minha ONG' }),
      ).toHaveAttribute('href', '/cadastro/sobre');
      expect(
        within(dialog).getByRole('link', { name: 'Entrar' }),
      ).toHaveAttribute('href', '/entrar');
      expect(
        within(dialog).getByRole('link', { name: 'Sobre a demonstração' }),
      ).toHaveAttribute('href', '/sobre-a-demo');
      expect(
        within(dialog).getByRole('link', { name: 'Termos' }),
      ).toHaveAttribute('href', '/termos');
      expect(
        within(dialog).getByRole('link', { name: 'Privacidade' }),
      ).toHaveAttribute('href', '/privacidade');
      expect(dialog.className).toContain('bg-nav-menu');
      expect(dialog.className).toContain('motion-reduce:transition-none');
    });

    it('ao abrir, o foco vai para o menu; Esc fecha e o foco volta ao ≡', async () => {
      renderNavbar();

      await userEvent.click(openMenu());
      expect(screen.getByRole('dialog')).toContainElement(
        document.activeElement as HTMLElement,
      );

      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(openMenu()).toHaveFocus();
    });

    it('o ✕ fecha o menu', async () => {
      renderNavbar();

      await userEvent.click(openMenu());
      await userEvent.click(
        screen.getByRole('button', { name: 'Fechar menu' }),
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('tocar num link fecha o menu', async () => {
      renderNavbar();

      await userEvent.click(openMenu());
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('link', {
          name: 'Como funciona',
        }),
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('logada: o avatar fica na barra e o menu tem a ONG, "Ir para a Área da ONG" e "Sair" (logout)', async () => {
      const { logoutAction } = renderNavbar({ fetchStatus: LOGGED });
      await screen.findByRole('link', { name: 'Área da ONG Patas do Bairro' });

      await userEvent.click(openMenu());
      const dialog = screen.getByRole('dialog', { name: 'Menu' });

      expect(dialog).toHaveTextContent('Patas do Bairro');
      expect(
        within(dialog).getByRole('link', { name: 'Ir para a Área da ONG' }),
      ).toHaveAttribute('href', '/painel');
      expect(within(dialog).queryByRole('link', { name: 'Entrar' })).toBeNull();
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Sair' }),
      );
      await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1));
    });

    it('logada: "Ir para a Área da ONG" fecha o menu', async () => {
      renderNavbar({ fetchStatus: LOGGED });
      await screen.findByRole('link', { name: 'Área da ONG Patas do Bairro' });

      await userEvent.click(openMenu());
      await userEvent.click(
        screen.getByRole('link', { name: 'Ir para a Área da ONG' }),
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});

describe('fetchSessionStatus', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pede GET /session/status sem cache e devolve a resposta', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ loggedIn: true, name: 'Patas do Bairro' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSessionStatus()).resolves.toEqual({
      loggedIn: true,
      name: 'Patas do Bairro',
    });
    expect(fetchMock).toHaveBeenCalledWith('/session/status', {
      cache: 'no-store',
    });
  });

  it('resposta de erro → visitante', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    await expect(fetchSessionStatus()).resolves.toEqual({ loggedIn: false });
  });

  it('sem rede → visitante', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );

    await expect(fetchSessionStatus()).resolves.toEqual({ loggedIn: false });
  });
});
