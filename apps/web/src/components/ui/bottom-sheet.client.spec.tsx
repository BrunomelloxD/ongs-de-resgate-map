import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { BottomSheet, DRAG_THRESHOLD_PX } from './bottom-sheet.client';

type Listener = () => void;

function mockReducedMotion(initial: boolean) {
  const state = { matches: initial, listeners: new Set<Listener>() };
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query === '(prefers-reduced-motion: reduce)' && state.matches;
    },
    media: query,
    addEventListener: (_: string, l: Listener) => state.listeners.add(l),
    removeEventListener: (_: string, l: Listener) => state.listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
  return {
    change(matches: boolean) {
      state.matches = matches;
      act(() => state.listeners.forEach((l) => l()));
    },
    listeners: state.listeners,
  };
}

function renderSheet(props: Partial<Parameters<typeof BottomSheet>[0]> = {}) {
  return render(
    <BottomSheet
      label="Lista de ONGs"
      header={<p>8 ONGs perto de você</p>}
      {...props}
    >
      <a href="/ong/patas-do-bairro">Patas do Bairro</a>
    </BottomSheet>,
  );
}

const handle = () => screen.getByRole('button', { name: 'Lista de ONGs' });
const sheet = () => screen.getByRole('region', { name: 'Lista de ONGs' });

function drag(fromY: number, toY: number) {
  fireEvent.pointerDown(handle(), { clientY: fromY });
  fireEvent.pointerUp(handle(), { clientY: toY });
  fireEvent.click(handle());
}

beforeEach(() => {
  mockReducedMotion(false);
});

describe('BottomSheet (MAP-08)', () => {
  it('começa recolhido, com o cabeçalho visível e o conteúdo fora do foco', () => {
    renderSheet();

    expect(handle()).toHaveAttribute('aria-expanded', 'false');
    expect(sheet()).toHaveAttribute('data-state', 'collapsed');
    expect(screen.getByText('8 ONGs perto de você')).toBeVisible();
    expect(
      document.getElementById(handle().getAttribute('aria-controls')!),
    ).toHaveAttribute('inert');
  });

  it('toque na alça alterna entre recolhido e aberto', async () => {
    renderSheet();

    await userEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
    expect(sheet()).toHaveAttribute('data-state', 'open');
    expect(
      screen.getByRole('link', { name: 'Patas do Bairro' }).closest('[inert]'),
    ).toBeNull();

    await userEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter na alça também alterna (teclado)', async () => {
    renderSheet();
    handle().focus();

    await userEvent.keyboard('{Enter}');

    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('arraste para cima acima do limiar abre', () => {
    renderSheet();

    drag(600, 600 - DRAG_THRESHOLD_PX - 10);

    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('arraste para baixo acima do limiar recolhe', () => {
    renderSheet({ defaultOpen: true });

    drag(300, 300 + DRAG_THRESHOLD_PX + 10);

    expect(handle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('arraste para cima com a folha já aberta a mantém aberta', () => {
    renderSheet({ defaultOpen: true });

    drag(600, 400);

    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('movimento abaixo do limiar vale como toque', () => {
    renderSheet();

    drag(600, 600 - (DRAG_THRESHOLD_PX - 1));

    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('soltar o ponteiro sem ter pressionado na alça não é arraste', () => {
    renderSheet();

    fireEvent.pointerUp(handle(), { clientY: 100 });

    expect(handle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('avisa a mudança e respeita o estado controlado', async () => {
    const onOpenChange = vi.fn();
    renderSheet({ open: false, onOpenChange });

    await userEvent.click(handle());

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('com movimento, a transição fica ligada', () => {
    renderSheet();

    expect(sheet().className).toContain('transition-transform');
  });

  it("matchMedia('(prefers-reduced-motion: reduce)') desliga a transição (A11Y-09)", () => {
    const media = mockReducedMotion(true);
    const { unmount } = renderSheet();

    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce)',
    );
    expect(sheet().className).not.toContain('transition');

    media.change(false);
    expect(sheet().className).toContain('transition-transform');

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('sem cabeçalho, mostra só a alça e o conteúdo', () => {
    render(
      <BottomSheet label="Lista">
        <p>conteúdo</p>
      </BottomSheet>,
    );

    expect(screen.getByRole('region', { name: 'Lista' }).children).toHaveLength(
      2,
    );
  });

  it('no servidor, renderiza recolhido e sem ler o matchMedia', () => {
    const html = renderToString(
      <BottomSheet label="Lista">
        <p>conteúdo</p>
      </BottomSheet>,
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('transition-transform');
  });
});
